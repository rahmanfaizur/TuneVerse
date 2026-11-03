import { Server, Socket } from "socket.io";
import { EVENTS, CreateRoomPayload, JoinRoomPayload, SearchPayload } from "@tuneverse/shared";
import { RoomStore, toPublicRoom } from "./state/room-store";
import { isValidPayload } from "./socket-validation";
import { RecommendationService } from "./services/recommendation";
import { YouTubeService, parseYouTubeLink } from "./services/youtube";


const socketToRoom = new Map<string, string>(); // socketId -> roomId (NEW: fast lookup)
const pendingJoins = new Map<string, { roomId: string; user: any }>(); // socketId -> { roomId, user }
const hostReassignmentTimeouts = new Map<string, NodeJS.Timeout>(); // roomId -> timeout

const usernameIn = (roomId: string, socketId: string): string =>
    RoomStore.getRoom(roomId)?.users.find(u => u.id === socketId)?.username || "Anon";

export const setupSocket = (io: Server) => {
    io.on("connection", (socket: Socket) => {
        console.log(`🔌 New Connection: ${socket.id}`);

        socket.use(([event, payload], next) => {
            if (isValidPayload(event, payload)) return next();
            console.warn(`Dropped malformed ${event} from ${socket.id}`);
        });

        // --- 0. CLOCK SYNC ---
        socket.on(EVENTS.SYNC_CLOCK, (payload: { clientSendTime: number }) => {
            const serverReceiveTime = Date.now();
            socket.emit(EVENTS.SYNC_CLOCK_RESPONSE, {
                clientSendTime: payload.clientSendTime,
                serverReceiveTime,
                serverSendTime: Date.now()
            });
        });

        socket.on(EVENTS.SYNC_PING, (payload: { clientSendTime: number }) => {
            socket.emit(EVENTS.SYNC_PONG, {
                clientSendTime: payload.clientSendTime,
                serverTime: Date.now()
            });
        });

        // --- 1. CREATE ROOM ---
        socket.on(EVENTS.ROOM_CREATE, (payload: CreateRoomPayload & { isPersistent?: boolean }) => {
            const { username, isPersistent, roomName, fingerprint } = payload;
            // In a real app, userId comes from Auth, here we use socket.id for now
            const user = {
                id: socket.id,
                username,
                avatarUrl: `https://api.dicebear.com/9.x/avataaars/svg?seed=${username}`,
                fingerprint // <--- NEW
            };

            const newRoom = RoomStore.createRoom(user);
            if (roomName) {
                newRoom.name = roomName;
            }
            newRoom.isPersistent = !!isPersistent;

            // Socket.io grouping
            socket.join(newRoom.id);
            socketToRoom.set(socket.id, newRoom.id);

            // Notify the creator IMMEDIATELY (Optimistic UI)
            socket.emit(EVENTS.ROOM_UPDATE, toPublicRoom(newRoom));
            socket.emit(EVENTS.ROOM_CREATED, { roomId: newRoom.id });
            console.log(`🏠 Room Created: ${newRoom.id} by ${username}`);
        });

        // --- 2. JOIN ROOM ---
        socket.on(EVENTS.ROOM_JOIN, async (payload: JoinRoomPayload) => {
            const { roomId, username, fingerprint } = payload;
            const user = {
                id: socket.id,
                username,
                avatarUrl: `https://api.dicebear.com/9.x/avataaars/svg?seed=${username}`,
                fingerprint // <--- NEW
            };

            const room = RoomStore.getRoom(roomId);

            if (!room) {
                socket.emit(EVENTS.ERROR, { message: "Room not found" });
                return;
            }

            const isAllowed = !!fingerprint && room.allowedFingerprints.includes(fingerprint);

            if (isAllowed) {
                const updatedRoom = RoomStore.joinRoom(roomId, user);
                if (!updatedRoom) return;

                // socket.id changes on refresh, so the fingerprint is how we recognise
                // a host coming back during the grace period.
                const hostIsGone = !updatedRoom.users.some(u => u.id === updatedRoom.hostId);
                if (fingerprint === updatedRoom.hostFingerprint && hostIsGone) {
                    clearTimeout(hostReassignmentTimeouts.get(roomId));
                    hostReassignmentTimeouts.delete(roomId);
                    updatedRoom.hostId = user.id;
                    console.log(`Host restored for ${roomId}: ${username}`);
                }

                if (updatedRoom.users.length === 1) {
                    updatedRoom.hostId = user.id;
                }

                socket.join(roomId);
                socketToRoom.set(socket.id, roomId);
                socket.emit(EVENTS.ROOM_JOINED, { roomId });
                io.to(roomId).emit(EVENTS.ROOM_UPDATE, toPublicRoom(updatedRoom));

                if (updatedRoom.hostId === user.id) {
                    pendingJoins.forEach((pending, pendingSocketId) => {
                        if (pending.roomId === roomId) {
                            socket.emit(EVENTS.JOIN_REQUEST_RECEIVED, {
                                roomId,
                                username: pending.user.username,
                                userId: pendingSocketId,
                            });
                        }
                    });
                }
                return;
            }

            // The room page re-sends ROOM_JOIN as its state changes, so only tell
            // the host about the first one.
            const alreadyAsked = pendingJoins.get(socket.id)?.roomId === roomId;
            pendingJoins.set(socket.id, { roomId, user });

            if (!alreadyAsked) {
                io.to(room.hostId).emit(EVENTS.JOIN_REQUEST_RECEIVED, {
                    roomId,
                    username,
                    userId: socket.id,
                });
            }

            // Notify User they are pending
            socket.emit(EVENTS.JOIN_PENDING, { roomId });
            console.log(`⏳ ${username} waiting for approval in ${roomId}`);
        });

        // --- 2.5 JOIN DECISION ---
        socket.on(EVENTS.JOIN_DECISION, (payload: { userId: string; roomId: string; approved: boolean }) => {
            const { userId, roomId, approved } = payload;
            const room = RoomStore.getRoom(roomId);

            if (!room) return;
            // Verify host
            if (room.hostId !== socket.id) {
                console.warn(`Unauthorized decision from ${socket.id} for room ${roomId}`);
                return;
            }

            const pending = pendingJoins.get(userId);
            if (!pending || pending.roomId !== roomId) {
                // Handle case where pending request is gone or mismatched
                return;
            }

            if (approved) {
                const updatedRoom = RoomStore.joinRoom(roomId, pending.user);
                RoomStore.addAllowedFingerprint(roomId, pending.user.fingerprint);

                // Get the socket of the approved user
                const targetSocket = io.sockets.sockets.get(userId);

                if (targetSocket && updatedRoom) {
                    targetSocket.join(roomId);
                    socketToRoom.set(userId, roomId);

                    targetSocket.emit(EVENTS.ROOM_JOINED, { roomId });
                    targetSocket.emit(EVENTS.JOIN_APPROVED, { roomId }); // Explicit approval event
                    io.to(roomId).emit(EVENTS.ROOM_UPDATE, toPublicRoom(updatedRoom));
                    console.log(`✅ Approved ${userId} for room ${roomId}`);
                }
            } else {
                io.to(userId).emit(EVENTS.JOIN_REJECTED, { roomId });
                console.log(`❌ Rejected ${userId} for room ${roomId}`);
            }

            pendingJoins.delete(userId);
        });

        // --- 3. DISCONNECT / LEAVE ---
        const handleLeave = (isExplicit: boolean = false) => {
            const roomId = socketToRoom.get(socket.id);
            if (!roomId) return;

            const roomBeforeLeave = RoomStore.getRoom(roomId);
            const wasHost = roomBeforeLeave?.hostId === socket.id;

            const updatedRoom = RoomStore.leaveRoom(roomId, socket.id);
            socketToRoom.delete(socket.id);

            if (updatedRoom) {
                // Room still exists, notify others
                io.to(roomId).emit(EVENTS.ROOM_UPDATE, toPublicRoom(updatedRoom));
                console.log(`👋 Socket ${socket.id} left room ${roomId}`);

                // Host Logic
                if (wasHost) {
                    if (isExplicit) {
                        // Explicit leave: Reassign immediately
                        const reassignRoom = RoomStore.reassignHost(roomId);
                        if (reassignRoom) {
                            io.to(roomId).emit(EVENTS.ROOM_UPDATE, toPublicRoom(reassignRoom));

                            // Notify NEW host of pending requests
                            pendingJoins.forEach((pending, pendingSocketId) => {
                                if (pending.roomId === roomId) {
                                    io.to(reassignRoom.hostId).emit(EVENTS.JOIN_REQUEST_RECEIVED, {
                                        roomId,
                                        username: pending.user.username,
                                        userId: pendingSocketId,
                                    });
                                }
                            });
                        }
                    } else {
                        // Disconnect (Refresh): Grace period
                        console.log(`👑 Host disconnected from ${roomId}. Waiting 30s...`);
                        const timeout = setTimeout(() => {
                            const roomNow = RoomStore.getRoom(roomId);
                            // If host hasn't returned (still same ID which is gone, or ID not in users)
                            if (roomNow && roomNow.hostId === socket.id) {
                                console.log(`👑 Host grace period expired for ${roomId}. Reassigning...`);
                                const reassignRoom = RoomStore.reassignHost(roomId);
                                if (reassignRoom) {
                                    io.to(roomId).emit(EVENTS.ROOM_UPDATE, toPublicRoom(reassignRoom));

                                    // Notify NEW host of pending requests
                                    pendingJoins.forEach((pending, pendingSocketId) => {
                                        if (pending.roomId === roomId) {
                                            io.to(reassignRoom.hostId).emit(EVENTS.JOIN_REQUEST_RECEIVED, {
                                                roomId,
                                                username: pending.user.username,
                                                userId: pendingSocketId,
                                            });
                                        }
                                    });
                                }
                            }
                            hostReassignmentTimeouts.delete(roomId);
                        }, 30000);
                        hostReassignmentTimeouts.set(roomId, timeout);
                    }
                }

            } else {
                // Room deleted (handled in RoomStore)
                // If room is gone, we don't need to do anything else
            }
        };

        socket.on(EVENTS.ROOM_LEAVE, () => handleLeave(true));
        socket.on("disconnect", () => {
            pendingJoins.delete(socket.id);
            handleLeave(false);
        });

        // --- 4. PLAYER CONTROLS ---

        // User clicked PLAY
        socket.on(EVENTS.PLAYER_PLAY, (payload: { videoId: string; timestamp: number }) => {
            const roomId = socketToRoom.get(socket.id);
            if (!roomId) return;

            const updatedRoom = RoomStore.updatePlayback(roomId, {
                status: "PLAYING",
                videoId: payload.videoId,
                timestamp: payload.timestamp,
            });

            if (updatedRoom) {
                io.to(roomId).emit(EVENTS.ROOM_UPDATE, toPublicRoom(updatedRoom));
                console.log(`▶️ Play in ${roomId} at ${payload.timestamp}s`);
            }
        });

        // User clicked PAUSE
        socket.on(EVENTS.PLAYER_PAUSE, (payload: { timestamp: number }) => {
            const roomId = socketToRoom.get(socket.id);
            if (!roomId) return;

            const updatedRoom = RoomStore.updatePlayback(roomId, {
                status: "PAUSED",
                timestamp: payload.timestamp,
            });

            if (updatedRoom) {
                io.to(roomId).emit(EVENTS.ROOM_UPDATE, toPublicRoom(updatedRoom));
                console.log(`⏸️ Pause in ${roomId} at ${payload.timestamp}s`);
            }
        });

        // User SEEKED (jumped to a new time)
        socket.on(EVENTS.PLAYER_SEEK, (payload: { timestamp: number }) => {
            const roomId = socketToRoom.get(socket.id);
            if (!roomId) return;

            // Seeking usually implies playing continues, or stays paused.
            // We accept the client's intent.
            const updatedRoom = RoomStore.updatePlayback(roomId, {
                timestamp: payload.timestamp,
            });

            if (updatedRoom) {
                io.to(roomId).emit(EVENTS.ROOM_UPDATE, toPublicRoom(updatedRoom));
                console.log(`⏩ Seek in ${roomId} to ${payload.timestamp}s`);
            }
        });

        socket.on(EVENTS.QUEUE_ADD, (payload: { videoId: string; title?: string; thumbnail?: string; source?: 'youtube' | 'spotify'; uri?: string; artist?: string; album?: string }) => {
            const roomId = socketToRoom.get(socket.id);
            if (!roomId) return;

            const video = {
                id: payload.videoId,
                title: payload.title || `Video (${payload.videoId})`,
                thumbnail: payload.thumbnail || `https://img.youtube.com/vi/${payload.videoId}/default.jpg`,
                addedBy: usernameIn(roomId, socket.id),
                votes: 0,
                voters: [],
                source: payload.source || 'youtube',
                uri: payload.uri,
                artist: payload.artist,
                album: payload.album
            };

            const updatedRoom = RoomStore.addToQueue(roomId, video);

            if (updatedRoom) {
                io.to(roomId).emit(EVENTS.ROOM_UPDATE, toPublicRoom(updatedRoom));
                console.log(`➕ Added to queue: ${payload.videoId} (${video.source})`);
            }
        });

        // Every listener's player reports the end of a song, so only the first report
        // for the track that's actually playing moves the queue on.
        socket.on(EVENTS.PLAYER_ENDED, (payload: { videoId: string }) => {
            const roomId = socketToRoom.get(socket.id);
            if (!roomId) return;

            const room = RoomStore.getRoom(roomId);
            if (!room || room.playback.videoId !== payload.videoId) return;

            const updatedRoom = RoomStore.skipTrack(roomId);
            if (updatedRoom) {
                io.to(roomId).emit(EVENTS.ROOM_UPDATE, toPublicRoom(updatedRoom));
            }
        });


        // --- 5. ENHANCED CONTROLS ---

        socket.on(EVENTS.PLAYER_SKIP, () => {
            const roomId = socketToRoom.get(socket.id);
            if (!roomId) return;
            // Host check? For now, anyone can skip
            const updatedRoom = RoomStore.skipTrack(roomId);
            if (updatedRoom) {
                io.to(roomId).emit(EVENTS.ROOM_UPDATE, toPublicRoom(updatedRoom));
                console.log(`⏭️ Skipped track in ${roomId}`);
            }
        });

        socket.on(EVENTS.PLAYER_PREVIOUS, () => {
            const roomId = socketToRoom.get(socket.id);
            if (!roomId) return;
            const updatedRoom = RoomStore.previousTrack(roomId);
            if (updatedRoom) {
                io.to(roomId).emit(EVENTS.ROOM_UPDATE, toPublicRoom(updatedRoom));
                console.log(`⏮️ Previous track in ${roomId}`);
            }
        });

        socket.on(EVENTS.QUEUE_REMOVE, (payload: { index: number }) => {
            const roomId = socketToRoom.get(socket.id);
            const room = roomId ? RoomStore.getRoom(roomId) : undefined;
            if (!roomId || !room) return;

            const track = room.queue[payload.index];
            const canRemove = track && (room.hostId === socket.id || track.addedBy === usernameIn(roomId, socket.id));
            if (!canRemove) return;

            const updatedRoom = RoomStore.removeFromQueue(roomId, payload.index);
            if (updatedRoom) io.to(roomId).emit(EVENTS.ROOM_UPDATE, toPublicRoom(updatedRoom));
        });

        socket.on(EVENTS.QUEUE_UPVOTE, (payload: { videoId: string }) => {
            const roomId = socketToRoom.get(socket.id);
            if (!roomId) return;
            const updatedRoom = RoomStore.upvoteTrack(roomId, payload.videoId, socket.id);
            if (updatedRoom) {
                io.to(roomId).emit(EVENTS.ROOM_UPDATE, toPublicRoom(updatedRoom));
                console.log(`👍 Upvoted ${payload.videoId} in ${roomId}`);
            }
        });

        socket.on(EVENTS.SEARCH_QUERY, async (payload: SearchPayload) => {
            const link = parseYouTubeLink(payload.query);

            try {
                if (link?.playlistId) {
                    const roomId = socketToRoom.get(socket.id);
                    if (roomId) {
                        const videos = await YouTubeService.getPlaylistVideos(link.playlistId);
                        for (const video of videos) {
                            RoomStore.addToQueue(roomId, {
                                ...video,
                                addedBy: usernameIn(roomId, socket.id),
                                votes: 0,
                                voters: [],
                                source: "youtube",
                            });
                        }
                        const room = RoomStore.getRoom(roomId);
                        if (room) io.to(roomId).emit(EVENTS.ROOM_UPDATE, toPublicRoom(room));
                        socket.emit(EVENTS.NOTICE, {
                            message: videos.length ? `Added ${videos.length} songs to the queue` : "Couldn't read that playlist. Is it private?",
                        });
                    }
                    socket.emit(EVENTS.SEARCH_RESULTS, []);
                    return;
                }

                socket.emit(EVENTS.SEARCH_RESULTS, await YouTubeService.search(link?.videoId ?? payload.query));
            } catch (e) {
                console.error("YouTube search failed", e);
                socket.emit(EVENTS.NOTICE, { message: "YouTube search isn't working right now. Try again in a bit." });
                socket.emit(EVENTS.SEARCH_RESULTS, []);
            }
        });

        // --- AI-POWERED RECOMMENDATIONS (GEMINI) ---
        socket.on(EVENTS.RECOMMENDATIONS_REQUEST, async (payload: { spotifyToken?: string; mood?: string } = {}) => {
            const roomId = socketToRoom.get(socket.id);
            if (!roomId) return;

            const room = RoomStore.getRoom(roomId);
            if (!room) return;

            try {
                // Analyze current queue and playing track
                const queue = room.queue || [];
                const currentVideoId = room.playback?.videoId;

                // Determine Source
                // If Spotify token is provided, prefer Spotify.
                // Otherwise, check current playing or queue.
                let source: 'youtube' | 'spotify' = payload.spotifyToken ? 'spotify' : 'youtube';

                // If we defaulted to Spotify but want to be smarter (e.g. if user is explicitly playing YouTube?),
                // we could check room state. But user request implies "if connected, use Spotify".
                // So the token presence is the strongest signal of intent here.

                // Fallback logic (if we didn't have a token, but maybe we should have? No, payload controls it)
                if (!payload.spotifyToken) {
                    if (room.playbackSource === 'spotify') {
                        source = 'spotify';
                    } else if (queue.length > 0) {
                        const lastItem = queue[queue.length - 1];
                        if (lastItem.source === 'spotify') {
                            source = 'spotify';
                        }
                    }
                }

                // If we want Spotify but have no token, fall back to YouTube? 
                // Or just try and fail? The service handles empty token by skipping Spotify search.
                if (source === 'spotify' && !payload.spotifyToken) {
                    console.warn("Spotify source requested but no token provided. Falling back to YouTube.");
                    source = 'youtube';
                }

                // Collect context
                const context = [];
                if (currentVideoId && room.playback && room.playback.meta) {
                    context.push({
                        title: room.playback.meta.title || "",
                        artist: room.playback.meta.artist || ""
                    });
                }
                queue.slice(0, 4).forEach(t => {
                    context.push({
                        title: t.title,
                        artist: t.artist || ""
                    });
                });

                if (context.length === 0) {
                    // Fallback context
                    context.push({ title: "Trending", artist: "Pop" });
                }

                console.log(`🤖 Requesting Gemini recommendations for ${roomId} [${source}] (Mood: ${payload.mood || 'None'})`);
                const recommendations = await RecommendationService.getRecommendations(context, source, payload.spotifyToken, payload.mood);

                socket.emit(EVENTS.RECOMMENDATIONS_RESULTS, recommendations);
                if (recommendations.length === 0) {
                    socket.emit(EVENTS.NOTICE, { message: "Couldn't come up with suggestions right now. Try again in a bit." });
                }
                console.log(`🤖 Sent ${recommendations.length} recommendations`);
            } catch (e: any) {
                console.error("Recommendations error", e);
                socket.emit(EVENTS.NOTICE, { message: "Couldn't come up with suggestions right now. Try again in a bit." });
                socket.emit(EVENTS.RECOMMENDATIONS_RESULTS, []);
            }
        });

        // --- 6. CHAT ---
        socket.on(EVENTS.CHAT_SEND, (payload: { text: string }) => {
            const roomId = socketToRoom.get(socket.id);
            if (!roomId) return;

            const message = {
                id: Math.random().toString(36).substring(2, 9),
                userId: socket.id,
                username: "Anon",
                avatarUrl: `https://api.dicebear.com/9.x/avataaars/svg?seed=Anon`,
                text: payload.text,
                timestamp: Date.now(),
            };

            // Use the username from the handshake/join if available, or just socket ID
            // Ideally we should store user info in socketToRoom or similar, but for now:
            // We can get the user from the room users list
            const room = RoomStore.getRoom(roomId);
            if (room) {
                const user = room.users.find(u => u.id === socket.id);
                if (user) {
                    message.username = user.username;
                    message.avatarUrl = user.avatarUrl || `https://api.dicebear.com/9.x/avataaars/svg?seed=${user.username}`;
                }
            }

            RoomStore.addMessage(roomId, message);
            io.to(roomId).emit(EVENTS.CHAT_RECEIVE, message);
        });

        // --- 7. REACTIONS ---
        socket.on(EVENTS.EMOJI_REACTION, (payload: { emoji: string }) => {
            const roomId = socketToRoom.get(socket.id);
            if (!roomId) return;

            // Broadcast to everyone in the room (including sender, for simplicity)
            io.to(roomId).emit(EVENTS.EMOJI_REACTION, {
                emoji: payload.emoji,
                userId: socket.id,
            });
        });
    });
};
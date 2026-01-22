import { Server, Socket } from "socket.io";
import { EVENTS, CreateRoomPayload, JoinRoomPayload, SearchPayload } from "@tuneverse/shared";
import { RoomStore } from "./state/room-store";
import ytsr from "ytsr";
import ytpl from "ytpl";


const activeUsers = new Map<string, string>(); // socketId -> userId (kept from Phase 3)
const socketToRoom = new Map<string, string>(); // socketId -> roomId (NEW: fast lookup)
const pendingJoins = new Map<string, { roomId: string; user: any }>(); // socketId -> { roomId, user }
const hostReassignmentTimeouts = new Map<string, NodeJS.Timeout>(); // roomId -> timeout

export const setupSocket = (io: Server) => {
    io.on("connection", (socket: Socket) => {
        console.log(`🔌 New Connection: ${socket.id}`);

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
            const { username, isPersistent, roomName } = payload;
            // In a real app, userId comes from Auth, here we use socket.id for now
            const user = {
                id: socket.id,
                username,
                avatarUrl: `https://api.dicebear.com/9.x/avataaars/svg?seed=${username}`
            };

            const newRoom = RoomStore.createRoom(user);
            if (roomName) {
                newRoom.name = roomName;
            }
            // @ts-ignore - Adding runtime property
            newRoom.isPersistent = !!isPersistent;

            // Socket.io grouping
            socket.join(newRoom.id);
            socketToRoom.set(socket.id, newRoom.id);

            // Notify the creator IMMEDIATELY (Optimistic UI)
            socket.emit(EVENTS.ROOM_UPDATE, newRoom);
            socket.emit(EVENTS.ROOM_CREATED, { roomId: newRoom.id });
            console.log(`🏠 Room Created: ${newRoom.id} by ${username}`);
        });

        // --- 2. JOIN ROOM ---
        socket.on(EVENTS.ROOM_JOIN, async (payload: JoinRoomPayload) => {
            const { roomId, username } = payload;
            const user = {
                id: socket.id,
                username,
                avatarUrl: `https://api.dicebear.com/9.x/avataaars/svg?seed=${username}`
            };

            const room = RoomStore.getRoom(roomId);

            if (!room) {
                socket.emit(EVENTS.ERROR, { message: "Room not found" });
                return;
            }

            // If user is the host OR is in the allowed list, join immediately
            // We check username because socket.id changes on refresh
            const isHost = room.users.find(u => u.id === room.hostId)?.username === username; // Check by username if possible, but hostId is socketId. 
            // Actually, hostId IS socketId. So on refresh, hostId won't match new socketId.
            // But we can check if the room has no host (if we implement that) OR if the username matches the *previous* host?
            // Simpler: Check allowedUsers. Host is added to allowedUsers on create.

            if (room.allowedUsers.includes(username)) {
                const updatedRoom = RoomStore.joinRoom(roomId, user);

                // If this user was the host (reconnecting), we might need to restore their host status?
                // But RoomStore.joinRoom just adds them.
                // If the room has a hostId that is NOT in the room (because they left), we should update it?
                // RoomStore.reassignHost handles "next person", but maybe we want "original host"?
                // For now, let's stick to: if allowed, join.

                // If the room currently has a hostId that corresponds to a user NOT in the room (ghost host),
                // and this user is joining, maybe they should become host?
                // But `leaveRoom` doesn't remove hostId immediately anymore.
                // So if host refreshes:
                // 1. leaveRoom called (hostId stays same).
                // 2. joinRoom called (new socketId).
                // 3. We need to update hostId to new socketId if username matches?
                // Let's do that here.

                // Check if the current host is "missing" from users list (meaning they are disconnected)
                // AND this joining user was the host (by username check? We don't store host username explicitly in Room, just hostId)
                // Wait, we can check if `room.allowedUsers[0]` (creator) is this user?
                // Or just: if room.hostId is not found in room.users, AND this user is allowed, make them host?
                // No, that's risky.

                // Better: If we have a pending host reassignment timeout for this room, CANCEL IT and make this user host.
                console.log(`🔍 Checking host restoration for ${username} in ${roomId}. Timeout exists: ${hostReassignmentTimeouts.has(roomId)}`);
                if (hostReassignmentTimeouts.has(roomId)) {
                    clearTimeout(hostReassignmentTimeouts.get(roomId));
                    hostReassignmentTimeouts.delete(roomId);
                    // If this is the host returning, update hostId to new socketId
                    // We assume the person returning within grace period IS the host (or at least allowed).
                    // But strictly, we should check if they were the host.
                    // Since we don't store "host username", we rely on the fact that only the host triggers the timeout.
                    // So if timeout exists, the host left.
                    // If *anyone* joins during timeout, do we make them host?
                    // No, only if it's the SAME user.
                    // But we can't verify identity easily without auth.
                    // For MVP: If timeout exists, and this user is allowed, assume it's the host returning?
                    // Or just let them join, and if they were host, they regain control?
                    // We need to update room.hostId to new socket.id.

                    // Let's assume for now: If timeout exists, we update hostId to this new user IF they are allowed.
                    // This is a bit loose but works for "refresh".
                    room.hostId = user.id;
                    console.log(`👑 Host restored for ${roomId}: ${username}`);
                }

                if (updatedRoom) {
                    socket.join(roomId);
                    socketToRoom.set(socket.id, roomId);
                    socket.emit(EVENTS.ROOM_JOINED, { roomId });
                    io.to(roomId).emit(EVENTS.ROOM_UPDATE, updatedRoom);

                    // If this user is the host, send them any pending requests they might have missed
                    if (room.hostId === user.id) {
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
                }
                return;
            }

            // Request Approval
            pendingJoins.set(socket.id, { roomId, user });

            // Notify Host
            io.to(room.hostId).emit(EVENTS.JOIN_REQUEST_RECEIVED, {
                roomId,
                username,
                userId: socket.id,
            });

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
                RoomStore.addAllowedUser(roomId, pending.user.username); // <--- Add to allowed list

                // Get the socket of the approved user
                const targetSocket = io.sockets.sockets.get(userId);

                if (targetSocket && updatedRoom) {
                    targetSocket.join(roomId);
                    socketToRoom.set(userId, roomId);

                    targetSocket.emit(EVENTS.ROOM_JOINED, { roomId });
                    targetSocket.emit(EVENTS.JOIN_APPROVED, { roomId }); // Explicit approval event
                    io.to(roomId).emit(EVENTS.ROOM_UPDATE, updatedRoom);
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
                io.to(roomId).emit(EVENTS.ROOM_UPDATE, updatedRoom);
                console.log(`👋 Socket ${socket.id} left room ${roomId}`);

                // Host Logic
                if (wasHost) {
                    if (isExplicit) {
                        // Explicit leave: Reassign immediately
                        const reassignRoom = RoomStore.reassignHost(roomId);
                        if (reassignRoom) {
                            io.to(roomId).emit(EVENTS.ROOM_UPDATE, reassignRoom);

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
                                    io.to(roomId).emit(EVENTS.ROOM_UPDATE, reassignRoom);

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
        socket.on("disconnect", () => handleLeave(false));

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
                io.to(roomId).emit(EVENTS.ROOM_UPDATE, updatedRoom);
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
                io.to(roomId).emit(EVENTS.ROOM_UPDATE, updatedRoom);
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
                io.to(roomId).emit(EVENTS.ROOM_UPDATE, updatedRoom);
                console.log(`⏩ Seek in ${roomId} to ${payload.timestamp}s`);
            }
        });

        socket.on(EVENTS.QUEUE_ADD, (payload: { videoId: string }) => {
            const roomId = socketToRoom.get(socket.id);
            if (!roomId) return;

            // For MVP, we mock the metadata. 
            // In Phase 10, we will fetch real titles from YouTube API.
            const video = {
                id: payload.videoId,
                title: `YouTube Video (${payload.videoId})`,
                thumbnail: `https://img.youtube.com/vi/${payload.videoId}/default.jpg`,
                addedBy: activeUsers.get(socket.id) || "Anon",
                votes: 0,
                voters: [],
            };

            const updatedRoom = RoomStore.addToQueue(roomId, video);

            if (updatedRoom) {
                io.to(roomId).emit(EVENTS.ROOM_UPDATE, updatedRoom);
                console.log(`➕ Added to queue: ${payload.videoId}`);
            }
        });

        // Song Ended -> Play Next
        socket.on(EVENTS.PLAYER_ENDED, () => {
            const roomId = socketToRoom.get(socket.id);
            if (!roomId) return;

            const room = RoomStore.getRoom(roomId);
            if (!room) return;

            // Only allow the HOST to signal "Next Song" to prevent spam
            // (Or let anyone do it for collaborative chaos, your choice. Let's start safe.)
            // if (room.hostId !== activeUsers.get(socket.id)) return; 

            if (room.queue.length > 0) {
                // Shift queue: First item becomes playing
                const nextVideo = room.queue.shift(); // Remove first item

                const updatedRoom = RoomStore.updatePlayback(roomId, {
                    status: "PLAYING",
                    videoId: nextVideo!.id,
                    timestamp: 0,
                });

                // Save the shifted queue
                room.queue = room.queue; // (In-memory reference allows this, but purely explicit is better)

                io.to(roomId).emit(EVENTS.ROOM_UPDATE, room);
                console.log(`⏭️ Next track: ${nextVideo!.id}`);
            } else {
                // Queue empty -> Stop
                const updatedRoom = RoomStore.updatePlayback(roomId, {
                    status: "IDLE", // Or stay paused
                    timestamp: 0,
                });
                io.to(roomId).emit(EVENTS.ROOM_UPDATE, updatedRoom);
            }
        });


        // --- 5. ENHANCED CONTROLS ---

        socket.on(EVENTS.PLAYER_SKIP, () => {
            const roomId = socketToRoom.get(socket.id);
            if (!roomId) return;
            // Host check? For now, anyone can skip
            const updatedRoom = RoomStore.skipTrack(roomId);
            if (updatedRoom) {
                io.to(roomId).emit(EVENTS.ROOM_UPDATE, updatedRoom);
                console.log(`⏭️ Skipped track in ${roomId}`);
            }
        });

        socket.on(EVENTS.PLAYER_PREVIOUS, () => {
            const roomId = socketToRoom.get(socket.id);
            if (!roomId) return;
            const updatedRoom = RoomStore.previousTrack(roomId);
            if (updatedRoom) {
                io.to(roomId).emit(EVENTS.ROOM_UPDATE, updatedRoom);
                console.log(`⏮️ Previous track in ${roomId}`);
            }
        });

        socket.on(EVENTS.QUEUE_UPVOTE, (payload: { videoId: string }) => {
            const roomId = socketToRoom.get(socket.id);
            if (!roomId) return;
            const updatedRoom = RoomStore.upvoteTrack(roomId, payload.videoId, socket.id);
            if (updatedRoom) {
                io.to(roomId).emit(EVENTS.ROOM_UPDATE, updatedRoom);
                console.log(`👍 Upvoted ${payload.videoId} in ${roomId}`);
            }
        });

        socket.on(EVENTS.SEARCH_QUERY, async (payload: SearchPayload) => {
            // Check if it's a playlist URL
            if (ytpl.validateID(payload.query)) {
                try {
                    const playlist = await ytpl(payload.query, { limit: 20 });
                    const roomId = socketToRoom.get(socket.id);
                    if (roomId) {
                        for (const item of playlist.items) {
                            const video = {
                                id: item.id,
                                title: item.title,
                                thumbnail: item.bestThumbnail.url || "",
                                addedBy: activeUsers.get(socket.id) || "Anon",
                                votes: 0,
                                voters: [],
                            };
                            RoomStore.addToQueue(roomId, video);
                        }
                        const room = RoomStore.getRoom(roomId);
                        if (room) io.to(roomId).emit(EVENTS.ROOM_UPDATE, room);
                        console.log(`📜 Added playlist ${playlist.title} to ${roomId}`);
                    }
                } catch (e) {
                    console.error("Playlist error", e);
                }
                return;
            }

            // Normal Search - Filter for music videos only
            try {
                // Append "music video" or "official audio" to queries for better music results
                const musicQuery = payload.query.toLowerCase().includes('music video') ||
                    payload.query.toLowerCase().includes('official') ||
                    payload.query.toLowerCase().includes('audio')
                    ? payload.query
                    : `${payload.query} music video`;

                const results = await ytsr(musicQuery, { limit: 10 }); // Increased limit to filter better
                const videos = results.items
                    .filter((i: any) => {
                        if (i.type !== 'video') return false;
                        // Additional filtering: prefer music-related content
                        const title = i.title?.toLowerCase() || '';
                        const channel = i.author?.name?.toLowerCase() || '';
                        const isMusicRelated =
                            title.includes('music') ||
                            title.includes('official') ||
                            title.includes('audio') ||
                            title.includes('video') ||
                            channel.includes('vevo') ||
                            channel.includes('official') ||
                            channel.includes('music');
                        return isMusicRelated;
                    })
                    .slice(0, 5) // Limit to top 5 after filtering
                    .map((i: any) => ({
                        id: i.id,
                        title: i.title,
                        thumbnail: i.bestThumbnail.url,
                        channelTitle: i.author?.name,
                    }));
                socket.emit(EVENTS.SEARCH_RESULTS, videos);
            } catch (e) {
                console.error("Search error", e);
            }
        });

        // --- AI-POWERED RECOMMENDATIONS ---
        socket.on(EVENTS.RECOMMENDATIONS_REQUEST, async () => {
            const roomId = socketToRoom.get(socket.id);
            if (!roomId) return;

            const room = RoomStore.getRoom(roomId);
            if (!room) return;

            try {
                // Analyze current queue and playing track to generate recommendations
                const queue = room.queue || [];
                const currentVideoId = room.playback?.videoId;

                // Collect track info for analysis
                const tracks = [...queue];
                if (currentVideoId && room.playback) {
                    // Add current playing track if it exists
                    const currentTrack = queue.find(t => t.id === currentVideoId);
                    if (currentTrack) tracks.unshift(currentTrack);
                }

                // Extract artists/keywords from queue titles
                const keywords = new Set<string>();
                tracks.forEach(track => {
                    const title = track.title.toLowerCase();
                    // Remove common words and extract meaningful terms
                    const words = title
                        .replace(/\(.*?\)/g, '') // Remove parentheses content
                        .replace(/\[.*?\]/g, '') // Remove brackets content
                        .replace(/official|video|audio|music|lyric|mv/g, '') // Remove common terms
                        .split(/[\s\-\,\/]+/)
                        .filter(w => w.length > 3); // Keep meaningful words
                    words.forEach(w => keywords.add(w));
                });

                // Use top keywords to search for similar music
                const topKeywords = Array.from(keywords).slice(0, 3).join(' ');
                const recommendationQuery = topKeywords
                    ? `${topKeywords} music video`
                    : 'trending music video'; // Fallback if queue is empty

                const results = await ytsr(recommendationQuery, { limit: 15 });
                const recommendations = results.items
                    .filter((i: any) => {
                        if (i.type !== 'video') return false;
                        // Filter out videos already in queue
                        const alreadyInQueue = queue.some(q => q.id === i.id);
                        if (alreadyInQueue) return false;

                        // Prefer music content
                        const title = i.title?.toLowerCase() || '';
                        const channel = i.author?.name?.toLowerCase() || '';
                        return title.includes('music') ||
                            title.includes('official') ||
                            channel.includes('vevo') ||
                            channel.includes('music');
                    })
                    .slice(0, 8) // Return top 8 recommendations
                    .map((i: any) => ({
                        id: i.id,
                        title: i.title,
                        thumbnail: i.bestThumbnail.url,
                        channelTitle: i.author?.name,
                    }));

                socket.emit(EVENTS.RECOMMENDATIONS_RESULTS, recommendations);
                console.log(`🤖 Generated ${recommendations.length} recommendations for ${roomId}`);
            } catch (e) {
                console.error("Recommendations error", e);
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
                username: activeUsers.get(socket.id) || "Anon", // Fallback, but should be set
                avatarUrl: `https://api.dicebear.com/9.x/avataaars/svg?seed=${activeUsers.get(socket.id) || "Anon"}`, // Fallback
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
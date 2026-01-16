import { Server, Socket } from "socket.io";
import { EVENTS, CreateRoomPayload, JoinRoomPayload, SearchPayload } from "@tuneverse/shared";
import { RoomStore } from "./state/room-store";
import ytsr from "ytsr";
import ytpl from "ytpl";


const activeUsers = new Map<string, string>(); // socketId -> userId (kept from Phase 3)
const socketToRoom = new Map<string, string>(); // socketId -> roomId (NEW: fast lookup)

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

            // Check DB for approval requirement (Simulated: All public for now, but we add logic)
            // In a real app, we'd check `room.isPublic`.

            const updatedRoom = RoomStore.joinRoom(roomId, user);

            if (updatedRoom) {
                socket.join(roomId);
                socketToRoom.set(socket.id, roomId);

                // Notify the joiner specifically
                socket.emit(EVENTS.ROOM_JOINED, { roomId });

                // Notify EVERYONE in the room (including new guy)
                io.to(roomId).emit(EVENTS.ROOM_UPDATE, updatedRoom);
                console.log(`👤 ${username} joined room ${roomId}`);


            } else {
                socket.emit(EVENTS.ERROR, { message: "Room not found" });
            }
        });

        // --- 2.5 JOIN REQUESTS ---
        socket.on(EVENTS.JOIN_REQUEST, (payload: JoinRoomPayload) => {
            const { roomId, username } = payload;
            const room = RoomStore.getRoom(roomId);

            if (!room) {
                socket.emit(EVENTS.ERROR, { message: "Room not found" });
                return;
            }

            // Emit to HOST only
            io.to(room.hostId).emit(EVENTS.JOIN_REQUEST_RECEIVED, {
                roomId,
                username,
                userId: socket.id, // The requester's socket ID
            });
            console.log(`📩 Join request from ${username} for room ${roomId}`);
        });

        socket.on(EVENTS.JOIN_DECISION, (payload: { userId: string; roomId: string; approved: boolean }) => {
            const { userId, roomId, approved } = payload;
            const room = RoomStore.getRoom(roomId);

            if (!room) return;
            // Verify host
            if (room.hostId !== socket.id) {
                console.warn(`Unauthorized decision from ${socket.id} for room ${roomId}`);
                return;
            }

            if (approved) {
                io.to(userId).emit(EVENTS.JOIN_APPROVED, { roomId });
                console.log(`✅ Approved ${userId} for room ${roomId}`);
            } else {
                io.to(userId).emit(EVENTS.JOIN_REJECTED, { roomId });
                console.log(`❌ Rejected ${userId} for room ${roomId}`);
            }
        });

        // --- 3. DISCONNECT / LEAVE ---
        const handleLeave = () => {
            const roomId = socketToRoom.get(socket.id);
            if (!roomId) return;

            const updatedRoom = RoomStore.leaveRoom(roomId, socket.id);
            socketToRoom.delete(socket.id);

            if (updatedRoom) {
                // Room still exists, notify others
                io.to(roomId).emit(EVENTS.ROOM_UPDATE, updatedRoom);
                console.log(`👋 Socket ${socket.id} left room ${roomId}`);



            } else {
                // Only delete if NOT persistent
                // @ts-ignore
                const room = RoomStore.getRoom(roomId);
                // If room is already gone from store (leaveRoom returns null if empty/deleted), we need to check if we should keep it.
                // Actually RoomStore.leaveRoom deletes it from memory if empty.
                // We need to modify RoomStore to NOT delete if persistent, OR we handle DB deletion here.

                // Let's check DB for persistence if we don't have it in memory anymore?
                // Optimization: We should probably store isPersistent in RoomStore.

                // For now, let's assume if it was deleted from memory, we check DB?
                // Better approach: Update RoomStore to handle persistence.


            }
        };

        socket.on(EVENTS.ROOM_LEAVE, handleLeave);
        socket.on("disconnect", handleLeave);

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

            // Normal Search
            try {
                // Simplify: Just search directly
                const results = await ytsr(payload.query, { limit: 5 });
                const videos = results.items
                    .filter((i: any) => i.type === 'video')
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
import { Server, Socket } from "socket.io";
import { EVENTS, CreateRoomPayload, JoinRoomPayload, SearchPayload } from "@tuneverse/shared";
import { RoomStore } from "./state/room-store";
import ytsr from "ytsr";
import ytpl from "ytpl";
import { prisma } from "@tuneverse/database";

const activeUsers = new Map<string, string>(); // socketId -> userId (kept from Phase 3)
const socketToRoom = new Map<string, string>(); // socketId -> roomId (NEW: fast lookup)

export const setupSocket = (io: Server) => {
    io.on("connection", (socket: Socket) => {
        console.log(`🔌 New Connection: ${socket.id}`);

        // --- 1. CREATE ROOM ---
        socket.on(EVENTS.ROOM_CREATE, async (payload: CreateRoomPayload) => {
            const { username } = payload;
            // In a real app, userId comes from Auth, here we use socket.id for now
            const user = { id: socket.id, username };

            const newRoom = RoomStore.createRoom(user);

            // Sync with DB
            try {
                // Ensure user exists
                let dbUser = await prisma.user.findUnique({ where: { username } });
                if (!dbUser) {
                    dbUser = await prisma.user.create({ data: { username } });
                }

                await prisma.room.create({
                    data: {
                        id: newRoom.id, // Sync ID
                        name: `${username}'s Room`,
                        hostId: dbUser.id,
                        isPublic: true,
                        participants: {
                            create: {
                                userId: dbUser.id,
                                status: "APPROVED"
                            }
                        }
                    }
                });
            } catch (e) {
                console.error("DB Room Create Error", e);
            }

            // Socket.io grouping
            socket.join(newRoom.id);
            socketToRoom.set(socket.id, newRoom.id);

            // Notify the creator
            socket.emit(EVENTS.ROOM_UPDATE, newRoom);
            console.log(`🏠 Room Created: ${newRoom.id} by ${username}`);
        });

        // --- 2. JOIN ROOM ---
        socket.on(EVENTS.ROOM_JOIN, async (payload: JoinRoomPayload) => {
            const { roomId, username } = payload;
            const user = { id: socket.id, username };

            // Check DB for approval requirement (Simulated: All public for now, but we add logic)
            // In a real app, we'd check `room.isPublic`.

            const updatedRoom = RoomStore.joinRoom(roomId, user);

            if (updatedRoom) {
                socket.join(roomId);
                socketToRoom.set(socket.id, roomId);

                // Notify EVERYONE in the room (including new guy)
                io.to(roomId).emit(EVENTS.ROOM_UPDATE, updatedRoom);
                console.log(`👤 ${username} joined room ${roomId}`);
            } else {
                socket.emit(EVENTS.ERROR, { message: "Room not found" });
            }
        });

        // --- 2.5 JOIN DECISION (Host) ---
        socket.on(EVENTS.JOIN_DECISION, (payload: { userId: string; roomId: string; approved: boolean }) => {
            // TODO: Implement actual approval flow if we switch to private rooms.
            // For now, we just log it as we are keeping it public for MVP speed.
            console.log(`Decision for ${payload.userId} in ${payload.roomId}: ${payload.approved}`);
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
                console.log(`🗑️ Room ${roomId} deleted (empty)`);
                // Delete from DB
                prisma.room.delete({ where: { id: roomId } })
                    .catch((e) => console.error("DB Room Delete Error", e));
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
    });
};
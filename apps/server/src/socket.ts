import { Server, Socket } from "socket.io";
import { EVENTS, CreateRoomPayload, JoinRoomPayload } from "@tuneverse/shared";
import { RoomStore } from "./state/room-store";

const activeUsers = new Map<string, string>(); // socketId -> userId (kept from Phase 3)
const socketToRoom = new Map<string, string>(); // socketId -> roomId (NEW: fast lookup)

export const setupSocket = (io: Server) => {
    io.on("connection", (socket: Socket) => {
        console.log(`🔌 New Connection: ${socket.id}`);

        // --- 1. CREATE ROOM ---
        socket.on(EVENTS.ROOM_CREATE, (payload: CreateRoomPayload) => {
            const { username } = payload;
            // In a real app, userId comes from Auth, here we use socket.id for now
            const user = { id: socket.id, username };

            const newRoom = RoomStore.createRoom(user);

            // Socket.io grouping
            socket.join(newRoom.id);
            socketToRoom.set(socket.id, newRoom.id);

            // Notify the creator
            socket.emit(EVENTS.ROOM_UPDATE, newRoom);
            console.log(`🏠 Room Created: ${newRoom.id} by ${username}`);
        });

        // --- 2. JOIN ROOM ---
        socket.on(EVENTS.ROOM_JOIN, (payload: JoinRoomPayload) => {
            const { roomId, username } = payload;
            const user = { id: socket.id, username };

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
            }
        };

        socket.on(EVENTS.ROOM_LEAVE, handleLeave);
        socket.on("disconnect", handleLeave);
    });
};
import { Server, Socket } from "socket.io";
import { EVENTS } from "@tuneverse/shared"; // Ensure this import works

// 1. Simple In-Memory User Store
// Map<socketId, userId>
const activeUsers = new Map<string, string>();

export const setupSocket = (io: Server) => {
    io.on("connection", (socket: Socket) => {
        console.log(`🔌 New Connection: ${socket.id}`);

        // 2. Handle Handshake
        socket.on(EVENTS.HANDSHAKE, (payload: { userId: string }) => {
            const { userId } = payload;

            // Store the mapping
            activeUsers.set(socket.id, userId);

            console.log(`🤝 Handshake verified. Socket ${socket.id} is User ${userId}`);

            // Optional: Send an ack back? For now, silence is acceptance.
        });

        // 3. Handle Disconnect
        socket.on("disconnect", () => {
            const userId = activeUsers.get(socket.id);

            if (userId) {
                console.log(`👋 User ${userId} (Socket ${socket.id}) disconnected`);
                activeUsers.delete(socket.id);
            } else {
                console.log(`☠️ Unknown socket ${socket.id} disconnected`);
            }
        });
    });
};
import { Room, User } from "@tuneverse/shared";

// The "Database"
const rooms = new Map<string, Room>();

// Helper to generate short IDs (e.g., "AF3D")
const generateRoomId = () => Math.random().toString(36).substring(2, 6).toUpperCase();

export const RoomStore = {

    createRoom: (hostUser: User): Room => {
        const roomId = generateRoomId();
        const newRoom: Room = {
            id: roomId,
            hostId: hostUser.id,
            users: [hostUser],
            playback: {
                status: "IDLE",
                videoId: null,
                timestamp: 0,
                lastUpdated: Date.now(),
            },
        };

        rooms.set(roomId, newRoom);
        return newRoom;
    },

    getRoom: (roomId: string): Room | undefined => {
        return rooms.get(roomId);
    },

    joinRoom: (roomId: string, user: User): Room | undefined => {
        const room = rooms.get(roomId);
        if (!room) return undefined;

        // Prevent duplicates
        if (!room.users.find((u) => u.id === user.id)) {
            room.users.push(user);
        }
        return room;
    },

    leaveRoom: (roomId: string, userId: string): Room | undefined => {
        const room = rooms.get(roomId);
        if (!room) return undefined;

        // Remove user
        room.users = room.users.filter((u) => u.id !== userId);

        // If room is empty, delete it
        if (room.users.length === 0) {
            rooms.delete(roomId);
            return undefined; // Room is gone
        }

        // If Host left, assign new host (simple logic: next person in list)
        if (room.hostId === userId) {
            room.hostId = room.users[0].id;
        }

        return room;
    },
};

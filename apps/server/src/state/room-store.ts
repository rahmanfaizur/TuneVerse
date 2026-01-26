import { Room, User, Video } from "@tuneverse/shared";

// The "Database"
const rooms = new Map<string, Room>();
const cleanupTimeouts = new Map<string, NodeJS.Timeout>(); // <--- Store timeouts

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
            queue: [], // <--- Empty queue
            messages: [], // <--- Empty chat
            allowedUsers: [hostUser.username], // <--- Host is always allowed
            playbackSource: 'youtube',
            spotifyUsers: {},
        };

        rooms.set(roomId, newRoom);
        return newRoom;
    },

    getRoom: (roomId: string): Room | undefined => {
        return rooms.get(roomId);
    },

    // ... (joinRoom, leaveRoom, updatePlayback, addToQueue, etc.)

    addMessage: (roomId: string, message: any): Room | undefined => {
        const room = rooms.get(roomId);
        if (!room) return undefined;

        room.messages.push(message);

        // Keep last 50 messages
        if (room.messages.length > 50) {
            room.messages.shift();
        }

        return room;
    },

    joinRoom: (roomId: string, user: User): Room | undefined => {
        const room = rooms.get(roomId);
        if (!room) return undefined;

        // Cancel pending cleanup if any
        if (cleanupTimeouts.has(roomId)) {
            clearTimeout(cleanupTimeouts.get(roomId));
            cleanupTimeouts.delete(roomId);
            console.log(`♻️ Room ${roomId} cleanup cancelled (user joined)`);
        }

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
            // Check persistence (runtime property we added in socket.ts)
            // @ts-ignore
            if (!room.isPersistent) {
                // Schedule cleanup instead of deleting immediately
                console.log(`⏳ Room ${roomId} empty. Scheduled for cleanup in 30s.`);
                const timeout = setTimeout(() => {
                    rooms.delete(roomId);
                    cleanupTimeouts.delete(roomId);
                    console.log(`🗑️ Room ${roomId} deleted after grace period.`);
                }, 30000); // 30 seconds grace period

                cleanupTimeouts.set(roomId, timeout);
                return undefined; // Room is effectively "gone" for this user, but exists for re-join
            }
            // If persistent, we keep it!
            return room;
        }

        // NOTE: We do NOT reassign host here anymore. 
        // Host reassignment is handled by explicit call or timeout in socket.ts

        return room;
    },

    reassignHost: (roomId: string): Room | undefined => {
        const room = rooms.get(roomId);
        if (!room) return undefined;

        // If host is still in the room (e.g. they reconnected), don't change
        if (room.users.find(u => u.id === room.hostId)) return room;

        // Assign new host (next person in list)
        if (room.users.length > 0) {
            room.hostId = room.users[0].id;
            console.log(`👑 New Host for ${roomId}: ${room.hostId}`);
        }

        return room;
    },

    addAllowedUser: (roomId: string, username: string): Room | undefined => {
        const room = rooms.get(roomId);
        if (!room) return undefined;

        if (!room.allowedUsers.includes(username)) {
            room.allowedUsers.push(username);
        }
        return room;
    },

    updatePlayback: (
        roomId: string,
        newState: Partial<Room['playback']>
    ): Room | undefined => {
        const room = rooms.get(roomId);
        if (!room) return undefined;

        // Merge new state with existing state
        room.playback = {
            ...room.playback,
            ...newState,
            lastUpdated: Date.now(), // Always track WHEN this happened
        };

        return room;
    },

    // 2. Helper to add video
    addToQueue: (roomId: string, video: Video): Room | undefined => {
        const room = rooms.get(roomId);
        if (!room) return undefined;

        // Initialize votes
        video.votes = 0;
        video.voters = [];

        room.queue.push(video);

        // AUTO-PLAY: If nothing is playing (IDLE), start this song immediately!
        if (room.playback.status === "IDLE" && !room.playback.videoId) {
            room.playback.videoId = video.id;
            room.playback.status = "PLAYING";
            room.playback.timestamp = 0;
            room.playback.lastUpdated = Date.now();
            room.playbackSource = video.source || 'youtube'; // <--- Set source
            room.playback.meta = {
                title: video.title,
                artist: video.artist,
                album: video.album,
                artwork: video.thumbnail,
                uri: video.uri
            };
            // Remove from queue since it's now playing
            room.queue.shift();
        }

        return room;
    },

    skipTrack: (roomId: string): Room | undefined => {
        const room = rooms.get(roomId);
        if (!room) return undefined;

        if (room.queue.length > 0) {
            const nextVideo = room.queue.shift();
            room.playback = {
                status: "PLAYING",
                videoId: nextVideo!.id,
                timestamp: 0,
                lastUpdated: Date.now(),
            };
            room.playbackSource = nextVideo!.source || 'youtube'; // <--- Set source
        } else {
            room.playback = {
                status: "IDLE",
                videoId: null,
                timestamp: 0,
                lastUpdated: Date.now(),
            };
        }
        return room;
    },

    previousTrack: (roomId: string): Room | undefined => {
        // For MVP, previous just restarts the current track
        // A real "Previous" needs a history stack
        const room = rooms.get(roomId);
        if (!room) return undefined;

        if (room.playback.videoId) {
            room.playback.timestamp = 0;
            room.playback.lastUpdated = Date.now();
        }
        return room;
    },

    upvoteTrack: (roomId: string, videoId: string, userId: string): Room | undefined => {
        const room = rooms.get(roomId);
        if (!room) return undefined;

        const video = room.queue.find((v) => v.id === videoId);
        if (!video) return undefined;

        if (video.voters.includes(userId)) return room; // Already voted

        video.votes += 1;
        video.voters.push(userId);

        // Re-sort queue: Highest votes first
        room.queue.sort((a, b) => b.votes - a.votes);

        return room;
    },

    getAllRooms: (): Room[] => {
        return Array.from(rooms.values());
    },
};

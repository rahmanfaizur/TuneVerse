import { randomBytes } from "crypto";
import { CHAT_PAGE_SIZE, ChatHistoryPage, PublicRoom, Room, RoomSummary, User, Video } from "@tuneverse/shared";
import { RoomPersistence, RoomSnapshot } from "./room-persistence";

// The "Database"
const rooms = new Map<string, Room>();
const cleanupTimeouts = new Map<string, NodeJS.Timeout>(); // <--- Store timeouts
const emptySince = new Map<string, number>(); // roomId -> when the last person left

// Short enough to read out loud. Skips look-alike characters (0/O, 1/I).
const ROOM_ID_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

// How long an empty room is kept. Guest rooms are throwaway; rooms made by an account
// wait a week for their host, then go too, so old rooms don't pile up forever.
const EMPTY_ROOM_GRACE_MS = 5 * 60 * 1000;
const SAVED_ROOM_GRACE_MS = 7 * 24 * 60 * 60 * 1000;
const graceFor = (room: Room) => (room.isPersistent ? SAVED_ROOM_GRACE_MS : EMPTY_ROOM_GRACE_MS);

// Keeps one big playlist paste from growing a room without end.
export const MAX_QUEUE = 200;
// Chat kept per room. Only the newest page rides along with room updates.
const MAX_MESSAGES = 300;

// Every change goes through here, so the saved copy keeps up.
const touch = (room: Room): Room => {
    RoomPersistence.markDirty(room.id);
    return room;
};

// An empty room hangs around for a while in case people come back.
const scheduleCleanup = (room: Room, since = Date.now()) => {
    const roomId = room.id;
    clearTimeout(cleanupTimeouts.get(roomId));
    emptySince.set(roomId, since);
    const delay = Math.max(0, graceFor(room) - (Date.now() - since));
    console.log(`⏳ Room ${roomId} empty. Cleanup in ${Math.round(delay / 60000)}m.`);
    const timeout = setTimeout(() => {
        rooms.delete(roomId);
        cleanupTimeouts.delete(roomId);
        emptySince.delete(roomId);
        RoomPersistence.markDirty(roomId);
        console.log(`🗑️ Room ${roomId} deleted after grace period.`);
    }, delay);
    cleanupTimeouts.set(roomId, timeout);
};

const generateRoomId = (): string => {
    let id: string;
    do {
        id = Array.from(randomBytes(6), (byte) => ROOM_ID_CHARS[byte % ROOM_ID_CHARS.length]).join("");
    } while (rooms.has(id));
    return id;
};

export const toPublicRoom = (room: Room): PublicRoom => {
    const { hostFingerprint, allowedFingerprints, ...rest } = room;
    return {
        ...rest,
        users: room.users.map(({ fingerprint, ...user }) => user),
        messages: room.messages.slice(-CHAT_PAGE_SIZE),
    };
};

export const toRoomSummary = (room: Room): RoomSummary => ({
    id: room.id,
    name: room.name,
    hostId: room.hostId,
    users: room.users.map(({ id, username }) => ({ id, username })),
    nowPlaying: room.playback.videoId && room.playback.meta
        ? {
            title: room.playback.meta.title,
            artwork: room.playback.meta.artwork,
            source: room.playbackSource,
        }
        : undefined,
});

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
            playbackSource: 'youtube',
            hostUsername: hostUser.username,
            isPersistent: false,
            hostFingerprint: hostUser.fingerprint,
            allowedFingerprints: hostUser.fingerprint ? [hostUser.fingerprint] : [],
        };

        rooms.set(roomId, newRoom);
        return touch(newRoom);
    },

    getRoom: (roomId: string): Room | undefined => {
        return rooms.get(roomId);
    },

    // ... (joinRoom, leaveRoom, updatePlayback, addToQueue, etc.)

    addMessage: (roomId: string, message: any): Room | undefined => {
        const room = rooms.get(roomId);
        if (!room) return undefined;

        room.messages.push(message);

        if (room.messages.length > MAX_MESSAGES) {
            room.messages.splice(0, room.messages.length - MAX_MESSAGES);
        }

        return touch(room);
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
        emptySince.delete(roomId);

        // Prevent duplicates
        if (!room.users.find((u) => u.id === user.id)) {
            room.users.push(user);
        }
        return touch(room);
    },

    leaveRoom: (roomId: string, userId: string): Room | undefined => {
        const room = rooms.get(roomId);
        if (!room) return undefined;

        // Remove user
        room.users = room.users.filter((u) => u.id !== userId);

        // If room is empty, delete it
        if (room.users.length === 0) {
            scheduleCleanup(room);
            touch(room);
            // A guest room is effectively "gone" for this user, but exists for re-join.
            return room.isPersistent ? room : undefined;
        }

        // NOTE: We do NOT reassign host here anymore. 
        // Host reassignment is handled by explicit call or timeout in socket.ts

        return touch(room);
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

        return touch(room);
    },

    addAllowedFingerprint: (roomId: string, fingerprint?: string): Room | undefined => {
        const room = rooms.get(roomId);
        if (!room) return undefined;

        if (fingerprint && !room.allowedFingerprints.includes(fingerprint)) {
            room.allowedFingerprints.push(fingerprint);
        }
        return touch(room);
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

        return touch(room);
    },

    // 2. Helper to add video
    addToQueue: (roomId: string, video: Video): Room | undefined => {
        const room = rooms.get(roomId);
        if (!room) return undefined;

        if (room.queue.length >= MAX_QUEUE) return undefined;

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

        return touch(room);
    },

    removeFromQueue: (roomId: string, index: number): Room | undefined => {
        const room = rooms.get(roomId);
        if (!room) return undefined;

        room.queue.splice(index, 1);
        return touch(room);
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
                meta: {
                    title: nextVideo!.title,
                    artist: nextVideo!.artist,
                    album: nextVideo!.album,
                    artwork: nextVideo!.thumbnail,
                    uri: nextVideo!.uri,
                },
            };
            room.playbackSource = nextVideo!.source || 'youtube';
        } else {
            room.playback = {
                status: "IDLE",
                videoId: null,
                timestamp: 0,
                lastUpdated: Date.now(),
            };
        }
        return touch(room);
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
        return touch(room);
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

        return touch(room);
    },

    // The page of chat just before a message the client already has.
    chatHistory: (roomId: string, beforeId: string): ChatHistoryPage => {
        const messages = rooms.get(roomId)?.messages ?? [];
        const end = messages.findIndex((m) => m.id === beforeId);
        if (end <= 0) return { messages: [], hasMore: false };
        const start = Math.max(0, end - CHAT_PAGE_SIZE);
        return { messages: messages.slice(start, end), hasMore: start > 0 };
    },

    getAllRooms: (): Room[] => {
        return Array.from(rooms.values());
    },

    // Bring back the rooms saved before the last restart. Call before taking connections.
    restore: async (): Promise<void> => {
        const snapshots: RoomSnapshot[] = await RoomPersistence.init((roomId) => {
            const room = rooms.get(roomId);
            return room && { room, emptySince: emptySince.get(roomId) };
        });
        const now = Date.now();

        for (const { room, savedAt, emptySince: since = now } of snapshots) {
            if (!room?.id || rooms.has(room.id)) continue;
            // Sat empty past its grace period while the server was down: let it go.
            if (now - since >= graceFor(room)) {
                RoomPersistence.markDirty(room.id);
                continue;
            }

            // Carry on from where the song had got to when the server stopped.
            const { playback } = room;
            if (playback.status === "PLAYING") {
                playback.timestamp += Math.max(0, savedAt - playback.lastUpdated) / 1000;
            }
            playback.lastUpdated = now;

            room.users = [];
            rooms.set(room.id, room);
            // Nobody is in it yet. If nobody comes back, it goes the usual way.
            scheduleCleanup(room, since);
        }
        if (snapshots.length) console.log(`♻️ Restored ${rooms.size} room(s) from the last run.`);
    },

    // Save every room right away. Used when the server is shutting down.
    saveAll: (): Promise<void> => RoomPersistence.flushAll([...rooms.keys()]),
};

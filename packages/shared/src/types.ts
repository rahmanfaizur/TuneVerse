// 1. A clean User object (sanitized, no secrets)
export interface User {
    id: string;      // The socket.id (or custom ID from handshake)
    username: string; // "CoolGuy123"
    color?: string;   // UI avatar color
}

// 2. The Room State
export type PlaybackStatus = "PLAYING" | "PAUSED" | "IDLE";

export interface PlaybackState {
    status: PlaybackStatus;
    videoId: string | null;  // e.g., "dQw4w9WgXcQ"
    timestamp: number;       // Current seek time in seconds
    lastUpdated: number;     // Server time (Date.now()) when status changed
}

export interface Room {
    id: string;
    hostId: string;   // The user who controls playback
    users: User[];    // List of everyone in the room
    playback: PlaybackState; // <--- NEW
}

// 3. Payload for Joining
export interface JoinRoomPayload {
    roomId: string;
    username: string;
}

// 4. Payload for Creating
export interface CreateRoomPayload {
    username: string;
}
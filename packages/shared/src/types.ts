// 1. A clean User object (sanitized, no secrets)
export interface User {
    id: string;      // The socket.id (or custom ID from handshake)
    username: string; // "CoolGuy123"
    avatarUrl?: string; // <--- NEW
    color?: string;   // UI avatar color
}

// 1. Define a Video Item
export interface Video {
    id: string;       // "dQw4w9WgXcQ" (YouTube) or Spotify track ID
    title: string;    // "Rick Astley - Never Gonna Give You Up"
    thumbnail: string;
    addedBy: string;  // username
    votes: number;    // <--- NEW
    voters: string[]; // <--- NEW: List of user IDs who voted
    source?: 'youtube' | 'spotify'; // <--- NEW: Track source
    uri?: string;     // <--- NEW: Spotify URI (spotify:track:...)
    artist?: string;  // <--- NEW: For Spotify tracks
    album?: string;   // <--- NEW: For Spotify tracks
}

// 2. The Room State
export type PlaybackStatus = "PLAYING" | "PAUSED" | "IDLE";

export interface PlaybackState {
    status: PlaybackStatus;
    videoId: string | null;  // e.g., "dQw4w9WgXcQ" or Spotify track ID
    timestamp: number;       // Current seek time in seconds
    lastUpdated: number;     // Server time (Date.now()) when status changed
    source?: 'youtube' | 'spotify'; // <--- NEW: Current playback source
    meta?: {
        title: string;
        artist?: string;
        album?: string;
        artwork?: string;
        uri?: string;
    };
}

export interface Room {
    id: string;
    name?: string; // <--- NEW: Custom room name
    hostId: string;   // The user who controls playback
    users: User[];    // List of everyone in the room
    playback: PlaybackState; // <--- NEW
    queue: Video[]; // <--- NEW: List of upcoming songs (mixed sources)
    messages: Message[]; // <--- NEW: Chat history
    allowedUsers: string[]; // <--- NEW: List of usernames allowed to join without approval
    playbackSource: 'youtube' | 'spotify'; // <--- NEW: Default playback source for room
    spotifyUsers: Record<string, { accessToken: string; expiresAt: number }>; // <--- NEW: Track Spotify auth per user
}

// 5. Chat Message
export interface Message {
    id: string;
    userId: string;
    username: string;
    avatarUrl?: string; // <--- NEW
    text: string;
    timestamp: number;
    isSystem?: boolean;
}

// 3. Payload for Joining
export interface JoinRoomPayload {
    roomId: string;
    username: string;
}

// 4. Payload for Creating
export interface CreateRoomPayload {
    username: string;
    roomName?: string;
}

// 3. Queue Payload
export interface AddToQueuePayload {
    videoId: string;
    title?: string;
    thumbnail?: string;
    source?: 'youtube' | 'spotify';
    uri?: string;
    artist?: string;
    album?: string;
}

// 4. Search Types
export interface SearchPayload {
    query: string;
}

export interface SearchResult {
    id: string;
    title: string;
    thumbnail: string;
    channelTitle: string;
}
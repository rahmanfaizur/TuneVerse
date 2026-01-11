export const EVENTS = {
    HANDSHAKE: "HANDSHAKE",

    // Room Events
    ROOM_CREATE: "ROOM_CREATE", // Client -> Server
    ROOM_JOIN: "ROOM_JOIN",     // Client -> Server
    ROOM_LEAVE: "ROOM_LEAVE",   // Client -> Server

    // Server Updates
    ROOM_UPDATE: "ROOM_UPDATE", // Server -> Client (Broadcast room state)
    ERROR: "ERROR",             // Server -> Client (e.g., "Room full")

    // Player Actions (Client -> Server)
    PLAYER_PLAY: "PLAYER_PLAY",
    PLAYER_PAUSE: "PLAYER_PAUSE",
    PLAYER_SEEK: "PLAYER_SEEK",
} as const;
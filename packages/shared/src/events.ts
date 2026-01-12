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
    PLAYER_SKIP: "PLAYER_SKIP",       // <--- NEW
    PLAYER_PREVIOUS: "PLAYER_PREVIOUS", // <--- NEW

    QUEUE_ADD: "QUEUE_ADD", // Client -> Server
    QUEUE_UPVOTE: "QUEUE_UPVOTE", // <--- NEW

    SEARCH_QUERY: "SEARCH_QUERY",     // <--- NEW
    SEARCH_RESULTS: "SEARCH_RESULTS", // <--- NEW
    PLAYER_ENDED: "PLAYER_ENDED", // Client -> Server (Host only usually)

    // Join Approval
    JOIN_REQUEST: "JOIN_REQUEST",     // Server -> Host (User wants to join)
    JOIN_DECISION: "JOIN_DECISION",   // Host -> Server (Approve/Reject)
} as const;
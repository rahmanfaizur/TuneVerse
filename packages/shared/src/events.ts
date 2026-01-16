export const EVENTS = {
    HANDSHAKE: "HANDSHAKE",

    // Room Events
    ROOM_CREATE: "ROOM_CREATE", // Client -> Server
    ROOM_CREATED: "ROOM_CREATED", // Server -> Client (Success response)
    ROOM_JOIN: "ROOM_JOIN",     // Client -> Server
    ROOM_JOINED: "ROOM_JOINED", // Server -> Client (Success response for joiner)
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
    QUEUE_REMOVE: "QUEUE_REMOVE", // Client -> Server
    QUEUE_UPVOTE: "QUEUE_UPVOTE", // <--- NEW

    SEARCH_QUERY: "SEARCH_QUERY",     // <--- NEW
    SEARCH_RESULTS: "SEARCH_RESULTS", // <--- NEW
    PLAYER_ENDED: "PLAYER_ENDED", // Client -> Server (Host only usually)

    // Join Approval
    JOIN_REQUEST: "JOIN_REQUEST",           // Client -> Server (User wants to join)
    JOIN_REQUEST_RECEIVED: "JOIN_REQUEST_RECEIVED", // Server -> Host (Host sees request)
    JOIN_DECISION: "JOIN_DECISION",         // Host -> Server (Approve/Reject)
    JOIN_APPROVED: "JOIN_APPROVED",         // Server -> Client (Success)
    JOIN_REJECTED: "JOIN_REJECTED",         // Server -> Client (Failure)

    // Sync Events
    SYNC_CLOCK: "SYNC_CLOCK",
    SYNC_CLOCK_RESPONSE: "SYNC_CLOCK_RESPONSE",
    SYNC_PING: "SYNC_PING",
    SYNC_PONG: "SYNC_PONG",

    // Chat
    CHAT_SEND: "CHAT_SEND",         // Client -> Server
    CHAT_RECEIVE: "CHAT_RECEIVE",   // Server -> Client

    // Reactions
    EMOJI_REACTION: "EMOJI_REACTION", // Client -> Server -> Client (Broadcast)
} as const;
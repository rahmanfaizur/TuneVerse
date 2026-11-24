import "dotenv/config";
import { config } from "./config";
import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import { setupSocket } from "./socket";
import { RoomStore, toRoomSummary } from "./state/room-store";
import authRoutes from "./routes/auth";
import spotifyRoutes from "./routes/spotify";
import { authenticateToken, AuthRequest } from "./middleware/auth";

const app = express();

// Heroku and Fly both sit behind a single proxy; rate limiting needs the real client IP.
app.set("trust proxy", 1);

app.use(cors({
    origin: config.corsOrigins,
    credentials: true
}));
app.use(express.json());

app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});

// Auth Routes
app.use("/api/auth", authRoutes);

// Spotify Routes
app.use("/api/spotify", spotifyRoutes);

// API Routes
app.get("/api/rooms", (_req, res) => {
    res.json(RoomStore.getAllRooms().map(toRoomSummary));
});

app.get("/api/rooms/my", authenticateToken, (req: AuthRequest, res) => {
    if (!req.user) return res.sendStatus(401);

    const username = req.user.username;
    const rooms = RoomStore.getAllRooms().filter(room => room.hostUsername === username);
    res.json(rooms.map(toRoomSummary));
});

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: config.corsOrigins,
        methods: ["GET", "POST"],
        credentials: true
    }
});

setupSocket(io);

const PORT = process.env.PORT || 4000;

// Load saved rooms first, so nobody reconnecting gets "Room not found".
RoomStore.restore().finally(() => {
    server.listen(PORT, () => {
        console.log(`Server is up and running on port ${PORT}`);
    });
});

// Render sends SIGTERM before a deploy or a free-plan sleep. Save rooms, then go.
let shuttingDown = false;
const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`${signal}: saving rooms before shutting down`);
    const forceExit = setTimeout(() => process.exit(0), 8000);
    try {
        await RoomStore.saveAll();
    } catch (err) {
        console.error("Couldn't save rooms on shutdown:", err);
    }
    clearTimeout(forceExit);
    process.exit(0);
};
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import { setupSocket } from "./socket";
import { RoomStore } from "./state/room-store";
import authRoutes from "./routes/auth";
import { authenticateToken, AuthRequest } from "./middleware/auth";

const app = express();

app.use(cors());
app.use(express.json());

// Auth Routes
app.use("/api/auth", authRoutes);

// API Routes
app.get("/api/rooms", (req, res) => {
    try {
        const rooms = RoomStore.getAllRooms().map(room => ({
            ...room,
            host: room.users.find(u => u.id === room.hostId) || { username: "Unknown" },
            participants: room.users
        }));
        res.json(rooms);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to fetch rooms" });
    }
});

app.get("/api/rooms/my", authenticateToken, (req: AuthRequest, res) => {
    try {
        if (!req.user) return res.sendStatus(401);

        // Filter rooms where the user is the host
        const rooms = RoomStore.getAllRooms().filter(room => room.hostId === req.user!.id).map(room => ({
            ...room,
            host: room.users.find(u => u.id === room.hostId) || { username: "Unknown" },
            participants: room.users
        }));
        res.json(rooms);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to fetch my rooms" });
    }
});

app.post("/api/rooms", authenticateToken, (req: AuthRequest, res) => {
    try {
        const { name } = req.body;

        if (!req.user) return res.sendStatus(401);

        // Create a user object for the host from the token
        const user = {
            id: req.user.id,
            username: req.user.username
        };

        const room = RoomStore.createRoom(user);
        if (name) {
            room.name = name;
        }

        // No DB sync needed for now as per previous logic, but we might want to add it later

        res.json(room);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to create room" });
    }
});

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

setupSocket(io);

const PORT = 4000;

server.listen(PORT, () => {
    console.log(`Server is up and running on port ${PORT}`);
})
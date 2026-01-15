import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import { setupSocket } from "./socket";
import { RoomStore } from "./state/room-store";

const app = express();

app.use(cors());
app.use(express.json());

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

app.post("/api/rooms", (req, res) => {
    try {
        const { name, username } = req.body;

        // Create a temporary user object for the host
        const user = {
            id: `user-${Date.now()}`, // Simple ID generation
            username
        };

        const room = RoomStore.createRoom(user);
        if (name) {
            room.name = name;
        }

        // No DB sync needed

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
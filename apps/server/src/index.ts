import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import { setupSocket } from "./socket";
import { prisma } from "@tuneverse/database";

const app = express();

app.use(cors());
app.use(express.json());

// API Routes
app.get("/api/rooms", async (req, res) => {
    try {
        const rooms = await prisma.room.findMany({
            where: { isPublic: true },
            include: { host: true, participants: true }
        });
        res.json(rooms);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to fetch rooms" });
    }
});

app.post("/api/rooms", async (req, res) => {
    try {
        const { name, username } = req.body;

        // Create User if not exists (simple auth for now)
        let user = await prisma.user.findUnique({ where: { username } });
        if (!user) {
            user = await prisma.user.create({ data: { username } });
        }

        const room = await prisma.room.create({
            data: {
                name,
                hostId: user.id,
                isPublic: true,
                participants: {
                    create: {
                        userId: user.id,
                        status: "APPROVED"
                    }
                }
            }
        });

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
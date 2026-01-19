import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import { setupSocket } from "./socket";
import { RoomStore } from "./state/room-store";
import authRoutes from "./routes/auth";
import { authenticateToken, AuthRequest } from "./middleware/auth";

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true
}));
app.use(express.json());

// ... (rest of the file)

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || "*",
        methods: ["GET", "POST"],
        credentials: true
    }
});

setupSocket(io);

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
    console.log(`Server is up and running on port ${PORT}`);
})
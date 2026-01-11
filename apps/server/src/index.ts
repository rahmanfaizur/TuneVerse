import express from "express";
import http from "http";
import cors from "cors";
import { setupSocket } from "./socket";

const app = express();

app.use(cors());

const server = http.createServer(app);
setupSocket(server);

const PORT = 4000;

server.listen(PORT, () => {
    console.log(`Server is up and running on port ${PORT}`);
})
import { io } from "socket.io-client";
import { EVENTS } from "@tuneverse/shared";

const socket = io("http://localhost:4000");

const MY_USER_ID = "user_123";

socket.on("connect", () => {
  console.log("Connected to server!");

  // IMMEDIATE HANDSHAKE
  console.log(`Sending Handshake for ${MY_USER_ID}...`);
  socket.emit(EVENTS.HANDSHAKE, { userId: MY_USER_ID });
});
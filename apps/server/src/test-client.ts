import { io, Socket } from "socket.io-client";
import { EVENTS } from "@tuneverse/shared";

// Helper to create a client
const createClient = (username: string): Promise<Socket> => {
  return new Promise((resolve) => {
    const socket = io("http://localhost:4000");

    socket.on("connect", () => {
      console.log(`🟢 [${username}] Connected (${socket.id})`);
      socket.emit(EVENTS.HANDSHAKE, { userId: username }); // Simple handshake
      resolve(socket);
    });
  });
};

async function main() {
  // 1. Host Connects
  const hostSocket = await createClient("HostUser");

  // 2. Host Creates Room
  console.log("creating room...");
  hostSocket.emit(EVENTS.ROOM_CREATE, { username: "HostUser" });

  // Listen for Room Update (Host)
  hostSocket.on(EVENTS.ROOM_UPDATE, async (room) => {
    console.log(`🏠 [Host] Room Updated: ${room.id} | Users: ${room.users.length}`);

    // 3. Friend Connects & Joins (Only if room is new)
    if (room.users.length === 1) {
      const friendSocket = await createClient("FriendUser");
      console.log(`running join for friend to room ${room.id}...`);
      friendSocket.emit(EVENTS.ROOM_JOIN, { roomId: room.id, username: "FriendUser" });

      // Listen for Room Update (Friend)
      friendSocket.on(EVENTS.ROOM_UPDATE, (r) => {
        console.log(`👋 [Friend] Room Updated: ${r.id} | Users: ${r.users.length}`);
      });
    }
  });
}

main();
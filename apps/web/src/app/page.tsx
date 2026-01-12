"use client";

import { useState } from "react";
import { useSocket } from "../../context/SocketContext";
import { EVENTS } from "@tuneverse/shared";
import ActiveRoom from "../components/ActiveRoom";
import RoomList from "../components/RoomList";

export default function Home() {
  const { socket, isConnected, room } = useSocket();
  const [username, setUsername] = useState("");
  const [hasJoined, setHasJoined] = useState(false);
  const [roomIdInput, setRoomIdInput] = useState("");

  // 1. Handshake Logic
  const handleConnect = () => {
    if (!socket || !username) return;
    socket.connect();
    socket.emit(EVENTS.HANDSHAKE, { userId: username });
    setHasJoined(true);
  };

  // 2. Room Logic
  const createRoom = () => {
    if (!socket) return;
    socket.emit(EVENTS.ROOM_CREATE, { username });
  };

  const joinRoom = () => {
    if (!socket || !roomIdInput) return;
    socket.emit(EVENTS.ROOM_JOIN, { roomId: roomIdInput, username });
  };

  // --- VIEW 3: ACTIVE ROOM ---
  if (room) {
    return (
      <main className="min-h-screen bg-gray-900 p-6">
        <ActiveRoom username={username} />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-900 text-white">
      <div className="max-w-md w-full">

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
            Tuneverse
          </h1>
          <p className="text-gray-400">Sync your vibe.</p>
        </div>

        <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700 shadow-xl">

          {/* Status Indicator */}
          <div className="mb-6 flex items-center justify-center gap-2 text-xs font-mono uppercase tracking-wide text-gray-500">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            {isConnected ? "Server Connected" : "Connecting..."}
          </div>

          {/* --- VIEW 1: LOGIN --- */}
          {!hasJoined ? (
            <div className="space-y-4">
              <label className="text-sm font-medium text-gray-300">Choose your Identity</label>
              <input
                autoFocus
                type="text"
                placeholder="e.g. Neo"
                className="w-full p-4 bg-gray-900 rounded-xl border border-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition text-lg"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleConnect()}
              />
              <button
                onClick={handleConnect}
                disabled={!username}
                className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition shadow-lg shadow-purple-900/20"
              >
                Enter Universe →
              </button>
            </div>
          ) : (

            /* --- VIEW 2: LOBBY --- */
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center">
                <p className="text-xl">Hi, <span className="font-bold text-white">{username}</span> 👋</p>
                <p className="text-sm text-gray-400">What would you like to do?</p>
              </div>

              <div className="grid gap-4">
                {/* Create Button */}
                <button
                  onClick={createRoom}
                  className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 group"
                >
                  <span>✨ Create New Room</span>
                </button>

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-700"></span></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-gray-800 px-2 text-gray-500">Or Join Existing</span></div>
                </div>

                {/* Join Inputs */}
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    placeholder="Room ID (e.g. A1B2)"
                    className="flex-1 p-3 bg-gray-900 rounded-xl border border-gray-600 focus:border-purple-500 outline-none uppercase font-mono text-center tracking-widest"
                    value={roomIdInput}
                    onChange={(e) => setRoomIdInput(e.target.value.toUpperCase())}
                  />
                  <button
                    onClick={joinRoom}
                    disabled={!roomIdInput}
                    className="px-6 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white font-bold rounded-xl transition"
                  >
                    Join
                  </button>
                </div>

                {/* Room List */}
                <RoomList onJoin={(id) => {
                  setRoomIdInput(id);
                  if (socket) socket.emit(EVENTS.ROOM_JOIN, { roomId: id, username });
                }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

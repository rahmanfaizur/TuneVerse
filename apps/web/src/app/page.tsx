"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "../../context/SocketContext";

export default function Home() {
  const { login, isConnected } = useSocket();
  const router = useRouter();
  const [username, setUsername] = useState("");

  useEffect(() => {
    // If already logged in, go to lobby
    if (localStorage.getItem("tuneverse_user")) {
      router.push("/lobby");
    }
  }, [router]);

  const handleLogin = () => {
    if (!username) return;
    login(username);
    router.push("/lobby");
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-900 text-white">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
            Tuneverse
          </h1>
          <p className="text-gray-400">Sync your vibe.</p>
        </div>

        <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700 shadow-xl">
          <div className="mb-6 flex items-center justify-center gap-2 text-xs font-mono uppercase tracking-wide text-gray-500">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            {isConnected ? "Server Connected" : "Connecting..."}
          </div>

          <div className="space-y-4">
            <label className="text-sm font-medium text-gray-300">Choose your Identity</label>
            <input
              autoFocus
              type="text"
              placeholder="e.g. Neo"
              className="w-full p-4 bg-gray-900 rounded-xl border border-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition text-lg"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
            <button
              onClick={handleLogin}
              disabled={!username}
              className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition shadow-lg shadow-purple-900/20"
            >
              Enter Universe →
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

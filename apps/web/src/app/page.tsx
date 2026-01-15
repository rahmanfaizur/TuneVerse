"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "../../context/SocketContext";
import { ThemeToggle } from "../components/ThemeToggle";

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
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-white dark:bg-black text-black dark:text-white selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black transition-colors duration-300">
      <ThemeToggle />
      <div className="max-w-md w-full text-center space-y-12">

        {/* Brand */}
        <div className="space-y-6">
          <h1 className="text-7xl md:text-9xl font-serif tracking-tighter uppercase leading-none ml-[-0.05em]">
            Tuneverse
          </h1>
          <div className="flex items-center justify-center gap-6 text-xs font-sans tracking-[0.3em] uppercase text-gray-400 dark:text-gray-500">
            <span>Sync</span>
            <span className="w-1 h-1 bg-black dark:bg-white rounded-full" />
            <span>Listen</span>
            <span className="w-1 h-1 bg-black dark:bg-white rounded-full" />
            <span>Vibe</span>
          </div>
        </div>

        {/* Login Form */}
        <div className="space-y-8 max-w-xs mx-auto">
          <div className="space-y-2">
            <label className="text-[10px] font-sans font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
              Identity
            </label>
            <input
              autoFocus
              type="text"
              placeholder="ENTER YOUR NAME"
              className="w-full py-2 bg-transparent border-b border-black dark:border-white outline-none text-center font-serif text-2xl placeholder:text-gray-300 dark:placeholder:text-gray-700 placeholder:font-sans placeholder:text-sm transition-all focus:border-b-2 text-black dark:text-white"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
          </div>

          <button
            onClick={handleLogin}
            disabled={!username}
            className="w-full py-4 bg-black dark:bg-white text-white dark:text-black font-sans text-xs uppercase tracking-[0.2em] hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Enter
          </button>
        </div>

        {/* Footer Status */}
        <div className="absolute bottom-8 left-0 right-0 text-center">
          <div className="inline-flex items-center gap-2 text-[10px] font-mono uppercase text-gray-400 dark:text-gray-600 border border-gray-100 dark:border-gray-800 px-3 py-1 rounded-full">
            <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-600' : 'bg-green-400'}`} />
            {isConnected ? "System Online" : "Connecting..."}
          </div>
        </div>
      </div>
    </main>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "../../../context/SocketContext";
import { EVENTS } from "@tuneverse/shared";
import RoomList from "../../components/RoomList";

export default function LobbyPage() {
    const { socket, isConnected, login } = useSocket();
    const router = useRouter();
    const [roomName, setRoomName] = useState("");
    const [isPersistent, setIsPersistent] = useState(false);
    const [username, setUsername] = useState("");
    const [roomIdInput, setRoomIdInput] = useState("");
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        const storedUser = localStorage.getItem("tuneverse_user");
        if (!storedUser) {
            router.push("/");
            return;
        }
        setUsername(storedUser);
    }, [router]);

    useEffect(() => {
        if (!socket) return;

        const handleRoomCreated = ({ roomId }: { roomId: string }) => {
            router.push(`/room/${roomId}`);
        };

        const handleRoomJoined = ({ roomId }: { roomId: string }) => {
            router.push(`/room/${roomId}`);
        };

        const handleError = (msg: string) => {
            if (msg === "Room not found") {
                // Refresh the list if we tried to join a stale room
                setRefreshKey(prev => prev + 1);
            }
        };

        socket.on(EVENTS.ROOM_CREATED, handleRoomCreated);
        socket.on(EVENTS.ROOM_JOINED, handleRoomJoined);
        socket.on(EVENTS.ERROR, handleError);

        return () => {
            socket.off(EVENTS.ROOM_CREATED, handleRoomCreated);
            socket.off(EVENTS.ROOM_JOINED, handleRoomJoined);
            socket.off(EVENTS.ERROR, handleError);
        };
    }, [socket, router]);

    const createRoom = () => {
        if (!socket) return;
        socket.emit(EVENTS.ROOM_CREATE, { name: roomName, isPersistent, host: username });
    };

    const joinRoom = () => {
        if (!socket || !roomIdInput) return;
        socket.emit(EVENTS.ROOM_JOIN, { roomId: roomIdInput, username });
    };

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8 bg-white dark:bg-black text-black dark:text-white selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black transition-colors duration-300">
            <div className="max-w-2xl w-full space-y-12">
                {/* Header */}
                <div className="text-center space-y-4">
                    <h1 className="text-6xl md:text-8xl font-serif tracking-tighter uppercase">
                        Tuneverse
                    </h1>
                    <div className="flex items-center justify-center gap-4 text-xs font-sans tracking-[0.2em] uppercase text-gray-500 dark:text-gray-400">
                        <span>Est. 2024</span>
                        <span className="w-1 h-1 bg-black dark:bg-white rounded-full" />
                        <span>Sync Your Vibe</span>
                        <span className="w-1 h-1 bg-black dark:bg-white rounded-full" />
                        <div className="flex items-center gap-1">
                            <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-600' : 'bg-red-500'}`} />
                            {isConnected ? "Online" : "Offline"}
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="space-y-8">
                    <div className="text-center space-y-2">
                        <p className="text-2xl font-serif italic">Welcome, {username}</p>
                        <button
                            onClick={() => {
                                login("");
                                localStorage.removeItem("tuneverse_user");
                                router.push("/");
                            }}
                            className="text-xs font-sans uppercase tracking-widest border-b border-black dark:border-white hover:opacity-50 transition"
                        >
                            Sign Out
                        </button>
                    </div>

                    <div className="grid gap-8 max-w-md mx-auto">
                        {/* Create Room Section */}
                        <div className="space-y-4">
                            <input
                                type="text"
                                placeholder="Name your session"
                                className="w-full py-3 bg-transparent border-b border-gray-300 dark:border-gray-700 focus:border-black dark:focus:border-white outline-none text-center font-serif text-xl placeholder:text-gray-400 placeholder:font-sans placeholder:text-sm transition-colors text-black dark:text-white"
                                value={roomName}
                                onChange={(e) => setRoomName(e.target.value)}
                            />

                            <div className="flex items-center justify-center gap-3">
                                <input
                                    type="checkbox"
                                    id="persistent"
                                    checked={isPersistent}
                                    onChange={(e) => setIsPersistent(e.target.checked)}
                                    className="w-4 h-4 accent-black dark:accent-white cursor-pointer"
                                />
                                <label htmlFor="persistent" className="text-xs uppercase tracking-wider cursor-pointer select-none text-gray-600 dark:text-gray-400">
                                    Persistent Room
                                </label>
                            </div>

                            <button
                                onClick={createRoom}
                                className="w-full py-4 bg-black dark:bg-white text-white dark:text-black font-sans text-xs uppercase tracking-[0.15em] hover:opacity-80 transition"
                            >
                                Create Session
                            </button>
                        </div>

                        {/* Divider */}
                        <div className="relative py-4">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-gray-200 dark:border-gray-800"></span>
                            </div>
                            <div className="relative flex justify-center">
                                <span className="bg-white dark:bg-black px-4 text-xs font-serif italic text-gray-400">or join existing</span>
                            </div>
                        </div>

                        {/* Join Room Section */}
                        <div className="space-y-4">
                            <div className="flex gap-0 border border-black dark:border-white">
                                <input
                                    type="text"
                                    placeholder="ENTER ROOM ID"
                                    className="flex-1 p-4 bg-transparent outline-none font-mono text-sm uppercase text-center tracking-widest placeholder:font-sans text-black dark:text-white placeholder:text-gray-400"
                                    value={roomIdInput}
                                    onChange={(e) => setRoomIdInput(e.target.value.toUpperCase())}
                                />
                                <button
                                    onClick={joinRoom}
                                    disabled={!roomIdInput}
                                    className="px-8 bg-black dark:bg-white text-white dark:text-black font-sans text-xs uppercase tracking-widest hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed transition border-l border-white dark:border-black"
                                >
                                    Join
                                </button>
                            </div>

                            <RoomList
                                refreshKey={refreshKey}
                                onJoin={(id) => {
                                    setRoomIdInput(id);
                                    if (socket) socket.emit(EVENTS.ROOM_JOIN, { roomId: id, username });
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}

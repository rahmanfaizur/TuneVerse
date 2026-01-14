"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "../../../context/SocketContext";
import { EVENTS } from "@tuneverse/shared";
import RoomList from "../../components/RoomList";

export default function LobbyPage() {
    const { socket, isConnected, login } = useSocket();
    const router = useRouter();
    const [roomIdInput, setRoomIdInput] = useState("");
    const [username, setUsername] = useState("");
    const [roomName, setRoomName] = useState("");
    const [isPersistent, setIsPersistent] = useState(false);

    useEffect(() => {
        // Check if logged in
        const storedUser = localStorage.getItem("tuneverse_user");
        if (!storedUser) {
            router.push("/");
        } else {
            setUsername(storedUser);
            // Clear inputs on mount
            setRoomIdInput("");
            setRoomName("");
            setIsPersistent(false);
        }
    }, [router]);

    useEffect(() => {
        if (!socket) return;

        // Listen for room creation/join to redirect
        const handleRoomUpdate = (room: any) => {
            router.push(`/room/${room.id}`);
        };

        socket.on(EVENTS.ROOM_UPDATE, handleRoomUpdate);

        return () => {
            socket.off(EVENTS.ROOM_UPDATE, handleRoomUpdate);
        };
    }, [socket, router]);

    const createRoom = () => {
        if (!socket) return;
        socket.emit(EVENTS.ROOM_CREATE, { username, isPersistent, roomName });
    };

    const joinRoom = () => {
        if (!socket || !roomIdInput) return;
        socket.emit(EVENTS.ROOM_JOIN, { roomId: roomIdInput, username });
    };

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8 bg-gray-900 text-white">
            <div className="max-w-md w-full">
                <div className="text-center mb-10 relative">
                    <h1 className="text-3xl md:text-5xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
                        Tuneverse
                    </h1>
                    <p className="text-gray-400">Lobby</p>
                    <button
                        onClick={() => {
                            login(""); // Hack to access logout if exposed, or just clear localstorage
                            localStorage.removeItem("tuneverse_user");
                            router.push("/");
                        }}
                        className="absolute top-0 right-0 text-xs text-red-400 hover:text-red-300 font-bold"
                    >
                        Logout
                    </button>
                </div>

                <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700 shadow-xl">
                    <div className="mb-6 flex items-center justify-center gap-2 text-xs font-mono uppercase tracking-wide text-gray-500">
                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                        {isConnected ? "Server Connected" : "Connecting..."}
                    </div>

                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="text-center">
                            <p className="text-xl">Hi, <span className="font-bold text-white">{username}</span> 👋</p>
                            <p className="text-sm text-gray-400">What would you like to do?</p>
                        </div>

                        <div className="grid gap-4">
                            <input
                                type="text"
                                placeholder="Room Name (Optional)"
                                className="w-full p-3 bg-gray-900 rounded-xl border border-gray-600 focus:border-purple-500 outline-none text-center"
                                value={roomName}
                                onChange={(e) => setRoomName(e.target.value)}
                            />
                            <button
                                onClick={createRoom}
                                className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 group"
                            >
                                <span>✨ Create New Room</span>
                            </button>

                            <div className="flex items-center justify-center gap-2">
                                <input
                                    type="checkbox"
                                    id="persistent"
                                    checked={isPersistent}
                                    onChange={(e) => setIsPersistent(e.target.checked)}
                                    className="w-4 h-4 accent-purple-600"
                                />
                                <label htmlFor="persistent" className="text-sm text-gray-400 select-none cursor-pointer">
                                    Keep room open when empty (Persistent)
                                </label>
                            </div>

                            <div className="relative py-2">
                                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-700"></span></div>
                                <div className="relative flex justify-center text-xs uppercase"><span className="bg-gray-800 px-2 text-gray-500">Or Join Existing</span></div>
                            </div>

                            <div className="flex gap-2 mb-4">
                                <input
                                    type="text"
                                    placeholder="Room ID"
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

                            <RoomList onJoin={(id) => {
                                setRoomIdInput(id);
                                if (socket) socket.emit(EVENTS.ROOM_JOIN, { roomId: id, username });
                            }} />
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "../../context/SocketContext";
import { useAuth } from "../../context/AuthContext";
import { EVENTS } from "@tuneverse/shared";
import RoomList from "../../components/RoomList";
import { toast } from "sonner";
import LoadingScreen from "../../components/LoadingScreen";

export default function LobbyPage() {
    const { socket, isConnected } = useSocket();
    const { user, logout } = useAuth();
    const router = useRouter();
    const [roomName, setRoomName] = useState("");
    const [roomIdInput, setRoomIdInput] = useState("");
    const [refreshKey, setRefreshKey] = useState(0);
    const [activeTab, setActiveTab] = useState<"all" | "my">("all");

    useEffect(() => {
        if (!user) {
            router.push("/");
        }
    }, [user, router]);

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
        if (!socket || !user) return;
        // Persistent by default if not a guest
        const isPersistent = !user.isGuest;
        socket.emit(EVENTS.ROOM_CREATE, { name: roomName, isPersistent, host: user.username });
    };

    useEffect(() => {
        if (!socket) return;

        const handleJoinApproved = ({ roomId }: { roomId: string }) => {
            toast.success("Join request accepted! Entering room...");
            if (user) {
                socket.emit(EVENTS.ROOM_JOIN, { roomId, username: user.username });
            }
        };

        const handleJoinRejected = () => {
            toast.error("Join request rejected by host.");
        };

        socket.on(EVENTS.JOIN_APPROVED, handleJoinApproved);
        socket.on(EVENTS.JOIN_REJECTED, handleJoinRejected);

        return () => {
            socket.off(EVENTS.JOIN_APPROVED, handleJoinApproved);
            socket.off(EVENTS.JOIN_REJECTED, handleJoinRejected);
        };
    }, [socket, user]);

    if (!isConnected || !socket) {
        return <LoadingScreen message="Connecting to server..." />;
    }

    const joinRoom = () => {
        if (!roomIdInput) return;
        router.push(`/room/${roomIdInput}`);
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
                        <p className="text-2xl font-serif italic">Welcome, {user?.username}</p>
                        <button
                            onClick={logout}
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
                        <div className="space-y-6">
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

                            {/* Tabs */}
                            <div className="flex border-b border-gray-200 dark:border-gray-800">
                                <button
                                    onClick={() => setActiveTab("all")}
                                    className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${activeTab === "all"
                                        ? "text-black dark:text-white border-b-2 border-black dark:border-white"
                                        : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                        }`}
                                >
                                    Online Rooms
                                </button>
                                <button
                                    onClick={() => setActiveTab("my")}
                                    className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${activeTab === "my"
                                        ? "text-black dark:text-white border-b-2 border-black dark:border-white"
                                        : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                        }`}
                                >
                                    My Rooms
                                </button>
                            </div>

                            <RoomList
                                refreshKey={refreshKey}
                                type={activeTab}
                                onJoin={(id) => {
                                    router.push(`/room/${id}`);
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "../context/SocketContext";
import { useSpotify } from "../context/SpotifyContext";
import { EVENTS, User } from "@tuneverse/shared";
import VideoPlayer from "./VideoPlayer";
import QueueSystem from "./QueueSystem";
import Chat from "./Chat";

export default function ActiveRoom({ username }: { username: string }) {
    const { socket, room } = useSocket();
    const { isConnected: spotifyConnected, connectSpotify, disconnectSpotify } = useSpotify();
    const router = useRouter();
    const [pendingRequests, setPendingRequests] = useState<{ userId: string; username: string }[]>([]);
    const [activeTab, setActiveTab] = useState<"queue" | "chat" | "users">("queue");

    useEffect(() => {
        if (!socket) return;

        const handleRequest = (payload: { userId: string; username: string }) => {
            setPendingRequests((prev) => [...prev, payload]);
        };

        socket.on(EVENTS.JOIN_REQUEST, handleRequest);
        return () => {
            socket.off(EVENTS.JOIN_REQUEST, handleRequest);
        };
    }, [socket]);

    const handleDecision = (userId: string, approved: boolean) => {
        socket?.emit(EVENTS.JOIN_DECISION, { userId, roomId: room?.id, approved });
        setPendingRequests((prev) => prev.filter((r) => r.userId !== userId));
    };

    if (!room) return <div>Loading Room...</div>;

    const handleLeave = () => {
        socket?.emit(EVENTS.ROOM_LEAVE);
        router.push("/lobby");
    };

    return (
        <div className="flex flex-col w-full max-w-6xl mx-auto min-h-screen md:h-[80vh] gap-8 p-4 md:p-0 bg-white dark:bg-black text-black dark:text-white">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-end border-b border-black dark:border-white pb-6 gap-6 md:gap-0">
                <div className="space-y-2">
                    <h2 className="text-3xl md:text-5xl lg:text-6xl font-serif tracking-tighter uppercase leading-none">
                        {room.name || <span className="italic">Session {room.id}</span>}
                    </h2>
                    <div className="flex items-center gap-4 text-[10px] font-sans uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-black dark:bg-white rounded-full"></span>
                            Host: {room.hostId === socket?.id ? "You" : "Remote"}
                        </span>
                        <span className="text-gray-300 dark:text-gray-700">|</span>
                        <span className="font-mono text-black dark:text-white">ID: {room.id}</span>
                    </div>
                </div>
                <div className="flex gap-4 w-full md:w-auto justify-start md:justify-end">
                    {!spotifyConnected ? (
                        <button
                            onClick={connectSpotify}
                            className="text-[10px] font-sans font-bold uppercase tracking-widest border-b border-green-500 text-green-500 pb-1 hover:opacity-50 transition"
                        >
                            ⚡ Connect Spotify
                        </button>
                    ) : (
                        <button
                            onClick={disconnectSpotify}
                            className="text-[10px] font-sans font-bold uppercase tracking-widest border-b border-red-500 text-red-500 pb-1 hover:opacity-50 transition"
                        >
                            ✕ Disconnect Spotify
                        </button>
                    )}
                    <button
                        onClick={() => {
                            navigator.clipboard.writeText(window.location.href);
                            alert("Link copied to clipboard!");
                        }}
                        className="text-[10px] font-sans font-bold uppercase tracking-widest border-b border-black dark:border-white pb-1 hover:opacity-50 transition"
                    >
                        Copy Link
                    </button>
                    <button
                        onClick={handleLeave}
                        className="text-[10px] font-sans font-bold uppercase tracking-widest border-b border-red-500 text-red-500 pb-1 hover:opacity-50 transition"
                    >
                        Leave Session
                    </button>
                </div>
            </div>

            {/* Host Approval Section */}
            {room.hostId === socket?.id && pendingRequests.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-900 border border-black dark:border-white p-4">
                    <h3 className="font-serif italic text-lg mb-2">Pending Requests</h3>
                    <div className="flex flex-wrap gap-2">
                        {pendingRequests.map((req) => (
                            <div key={req.userId} className="flex items-center gap-3 bg-white dark:bg-black border border-gray-200 dark:border-gray-800 p-2 pl-3">
                                <span className="text-sm font-sans">{req.username}</span>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => handleDecision(req.userId, true)}
                                        className="text-[10px] uppercase tracking-wider bg-black dark:bg-white text-white dark:text-black px-2 py-1 hover:opacity-80"
                                    >
                                        Accept
                                    </button>
                                    <button
                                        onClick={() => handleDecision(req.userId, false)}
                                        className="text-[10px] uppercase tracking-wider border border-black dark:border-white px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-900"
                                    >
                                        Deny
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-8 flex-1">

                {/* LEFT: Video Player */}
                <div className="lg:col-span-3 aspect-video bg-black border border-black dark:border-white relative">
                    <VideoPlayer room={room} socket={socket} />
                </div>

                {/* RIGHT: Unified Sidebar (Queue, Chat, Users) */}
                <div className="flex flex-col h-auto lg:h-full border border-black dark:border-white bg-white dark:bg-black">

                    {/* Tabs */}
                    <div className="flex border-b border-black dark:border-white">
                        <button
                            onClick={() => setActiveTab("queue")}
                            className={`flex-1 py-2.5 text-[10px] font-bold uppercase tracking-widest transition-colors ${activeTab === "queue"
                                ? "bg-black text-white dark:bg-white dark:text-black"
                                : "text-gray-500 hover:text-black dark:hover:text-white"
                                }`}
                        >
                            Queue
                        </button>
                        <button
                            onClick={() => setActiveTab("chat")}
                            className={`flex-1 py-2.5 text-[10px] font-bold uppercase tracking-widest transition-colors border-x border-black dark:border-white ${activeTab === "chat"
                                ? "bg-black text-white dark:bg-white dark:text-black"
                                : "text-gray-500 hover:text-black dark:hover:text-white"
                                }`}
                        >
                            Chat
                        </button>
                        <button
                            onClick={() => setActiveTab("users")}
                            className={`flex-1 py-2.5 text-[10px] font-bold uppercase tracking-widest transition-colors ${activeTab === "users"
                                ? "bg-black text-white dark:bg-white dark:text-black"
                                : "text-gray-500 hover:text-black dark:hover:text-white"
                                }`}
                        >
                            Users ({room.users.length})
                        </button>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-hidden relative bg-white dark:bg-black min-h-[300px] lg:min-h-0">
                        {activeTab === "queue" && (
                            <div className="h-full p-4">
                                <QueueSystem room={room} socket={socket} />
                            </div>
                        )}

                        {activeTab === "chat" && (
                            <Chat
                                roomId={room.id}
                                username={username}
                                initialMessages={room.messages || []}
                            />
                        )}

                        {activeTab === "users" && (
                            <div className="p-4 h-full overflow-y-auto space-y-2">
                                {room.users.map((u: User) => (
                                    <div key={u.id} className="flex items-center gap-3 py-1 group">
                                        <div className="w-6 h-6 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center text-[10px] font-bold font-sans">
                                            {(u.username?.[0] || "?").toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-sans truncate group-hover:underline decoration-1 underline-offset-2">
                                                {u.username}
                                                {u.id === socket?.id && <span className="text-gray-400 ml-1 italic">(You)</span>}
                                            </p>
                                        </div>
                                        {room.hostId === u.id && (
                                            <span className="text-[9px] uppercase tracking-widest border border-black dark:border-white px-1">HOST</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "../../context/SocketContext";
import { EVENTS } from "@tuneverse/shared";
import VideoPlayer from "./VideoPlayer";
import QueueSystem from "./QueueSystem";

export default function ActiveRoom({ username }: { username: string }) {
    const { socket, room } = useSocket();
    const router = useRouter();
    const [pendingRequests, setPendingRequests] = useState<{ userId: string; username: string }[]>([]);

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
        <div className="flex flex-col w-full max-w-6xl mx-auto min-h-screen md:h-[80vh] gap-6 p-4 md:p-0">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-gray-800 p-4 rounded-xl border border-gray-700 gap-4 md:gap-0">
                <div>
                    <h2 className="text-2xl font-bold text-white">
                        {room.name || `Room: ${room.id}`}
                    </h2>
                    <p className="text-gray-400 text-sm flex items-center gap-2">
                        Host: {room.hostId === socket?.id ? "You" : "Another User"}
                        <span className="text-gray-600">|</span>
                        <span className="font-mono text-purple-400 text-xs">ID: {room.id}</span>
                    </p>
                </div>
                <div className="flex gap-2 w-full md:w-auto justify-center md:justify-end">
                    <button
                        onClick={() => {
                            navigator.clipboard.writeText(window.location.href);
                            alert("Link copied to clipboard!");
                        }}
                        className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded transition flex items-center gap-2"
                    >
                        🔗 Share
                    </button>
                    <button
                        onClick={handleLeave}
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-500 px-4 py-2 rounded transition"
                    >
                        Leave
                    </button>
                </div>
            </div>

            {/* Host Approval Section */}
            {room.hostId === socket?.id && pendingRequests.length > 0 && (
                <div className="bg-yellow-900/20 border border-yellow-700/50 p-4 rounded-xl">
                    <h3 className="text-yellow-500 font-bold text-sm mb-2">🔔 Pending Join Requests</h3>
                    <div className="flex flex-wrap gap-2">
                        {pendingRequests.map((req) => (
                            <div key={req.userId} className="flex items-center gap-2 bg-gray-900 p-2 rounded border border-gray-700">
                                <span className="text-gray-200 text-sm">{req.username}</span>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => handleDecision(req.userId, true)}
                                        className="bg-green-600 hover:bg-green-500 text-white text-xs px-2 py-1 rounded"
                                    >
                                        ✓
                                    </button>
                                    <button
                                        onClick={() => handleDecision(req.userId, false)}
                                        className="bg-red-600 hover:bg-red-500 text-white text-xs px-2 py-1 rounded"
                                    >
                                        ✗
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1">

                {/* LEFT: Video Player */}
                <div className="lg:col-span-3 aspect-video bg-black rounded-xl border border-gray-800 overflow-hidden">
                    <VideoPlayer room={room} socket={socket} />
                </div>

                {/* RIGHT: Queue & User List */}
                <div className="flex flex-col gap-6 h-full">

                    {/* 1. Queue System (Top) */}
                    <div className="flex-1 min-h-[300px]">
                        <QueueSystem room={room} socket={socket} />
                    </div>

                    {/* 2. User List (Bottom) */}
                    <div className="h-48 bg-gray-800 rounded-xl border border-gray-700 p-4 flex flex-col">
                        <h3 className="font-bold text-gray-300 mb-2 text-sm">👥 Users ({room.users.length})</h3>
                        <div className="space-y-2 overflow-y-auto flex-1">
                            {room.users.map((u) => (
                                <div key={u.id} className="flex items-center gap-3 p-2 rounded hover:bg-gray-700/50 transition">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-xs font-bold">
                                        {u.username[0].toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-200 truncate">
                                            {u.username}
                                            {u.id === socket?.id && <span className="text-gray-500 ml-1">(You)</span>}
                                        </p>
                                    </div>
                                    {room.hostId === u.id && (
                                        <span className="text-xs bg-yellow-500/20 text-yellow-500 px-1.5 py-0.5 rounded">HOST</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

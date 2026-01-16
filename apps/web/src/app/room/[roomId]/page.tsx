"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSocket } from "../../../context/SocketContext";
import { useAuth } from "../../../context/AuthContext";
import { toast } from "sonner";
import { EVENTS } from "@tuneverse/shared";
import ActiveRoom from "../../../components/ActiveRoom";
import LoadingScreen from "../../../components/LoadingScreen";

export default function RoomPage() {
    const { roomId } = useParams();
    const { socket, room, isConnected, error } = useSocket(); // <--- Get error
    const { user } = useAuth();
    const router = useRouter();
    // Removed manual user fetching, using useAuth now

    useEffect(() => {
        if (!socket || !isConnected || !user || !roomId) return;

        // If we are not in the room yet (e.g. refresh), join it
        if (!room || room.id !== roomId) {
            console.log(`🔄 Auto-joining room ${roomId} as ${user.username}`);
            // Note: For auto-join on refresh, we might need to bypass approval if already approved?
            // For now, let's assume refresh requires re-join or we handle session persistence better later.
            // Actually, if we are host, we should just join.
            // If we are guest, we might need to re-request?
            // Let's stick to ROOM_JOIN for now for refresh logic, assuming server handles it.
            socket.emit(EVENTS.ROOM_JOIN, { roomId, username: user.username });
        }
    }, [socket, isConnected, user, roomId, room]);

    if (error) {
        return (
            <main className="min-h-screen bg-white dark:bg-black flex items-center justify-center text-black dark:text-white p-4 selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black transition-colors duration-300">
                <div className="text-center max-w-md space-y-6">
                    <div className="text-6xl mb-4 font-serif italic">404</div>
                    <div className="space-y-2">
                        <h2 className="text-3xl font-serif uppercase tracking-tight">Room Not Found</h2>
                        <p className="text-gray-500 dark:text-gray-400 font-sans text-sm tracking-wide">{error}</p>
                    </div>
                    <div className="pt-4">
                        <button
                            onClick={() => router.push("/")}
                            className="bg-black dark:bg-white text-white dark:text-black px-8 py-3 text-xs font-bold uppercase tracking-widest hover:opacity-80 transition"
                        >
                            Return Home
                        </button>
                    </div>
                </div>
            </main>
        );
    }

    if (!room) {
        return <LoadingScreen message="Entering Session..." />;
    }

    const [joinRequests, setJoinRequests] = useState<{ userId: string; username: string }[]>([]);

    useEffect(() => {
        if (!socket) return;

        const handleRequest = (payload: { roomId: string; username: string; userId: string }) => {
            toast.info(`${payload.username} wants to join!`);
            setJoinRequests((prev) => [...prev, payload]);
        };

        socket.on(EVENTS.JOIN_REQUEST_RECEIVED, handleRequest);

        return () => {
            socket.off(EVENTS.JOIN_REQUEST_RECEIVED, handleRequest);
        };
    }, [socket]);

    const handleDecision = (userId: string, approved: boolean) => {
        if (!socket || !roomId) return;
        socket.emit(EVENTS.JOIN_DECISION, { roomId, userId, approved });
        setJoinRequests((prev) => prev.filter((req) => req.userId !== userId));
        if (approved) toast.success("Request accepted");
        else toast.info("Request rejected");
    };

    // ... existing useEffects ...

    return (
        <main className="min-h-screen bg-white dark:bg-black p-6 transition-colors duration-300 relative">
            {/* Acceptance Bar */}
            {joinRequests.length > 0 && room?.hostId === socket?.id && (
                <div className="fixed top-0 left-0 right-0 bg-black text-white p-4 z-50 flex items-center justify-between shadow-lg animate-slide-down">
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-bold uppercase tracking-widest animate-pulse">
                            Join Request:
                        </span>
                        <span className="font-serif italic text-lg">
                            {joinRequests[0].username}
                        </span>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleDecision(joinRequests[0].userId, true)}
                            className="px-6 py-2 bg-white text-black text-xs font-bold uppercase tracking-widest hover:bg-gray-200 transition"
                        >
                            Accept
                        </button>
                        <button
                            onClick={() => handleDecision(joinRequests[0].userId, false)}
                            className="px-6 py-2 border border-white text-white text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition"
                        >
                            Decline
                        </button>
                    </div>
                </div>
            )}

            <ActiveRoom username={user?.username || "Guest"} />
        </main>
    );
}

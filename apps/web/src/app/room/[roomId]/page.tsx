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
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const [joinRequests, setJoinRequests] = useState<{ userId: string; username: string }[]>([]);
    const [isPending, setIsPending] = useState(false);
    // Removed manual user fetching, using useAuth now

    useEffect(() => {
        if (!user && !isLoading) {
            const callbackUrl = `/room/${roomId}`;
            router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
            return;
        }

        if (!socket || !isConnected || !user || !roomId) return;

        // If we are not in the room yet (e.g. refresh), join it
        if (!room || room.id !== roomId) {
            console.log(`🔄 Auto-joining room ${roomId} as ${user.username}`);
            socket.emit(EVENTS.ROOM_JOIN, { roomId, username: user.username });
        }
    }, [socket, isConnected, user, roomId, room, isLoading, router]);

    useEffect(() => {
        if (!socket) return;

        const handleRequest = (payload: { roomId: string; username: string; userId: string }) => {
            console.log("📩 Join Request Received:", payload);
            toast.info(`${payload.username} wants to join!`);
            setJoinRequests((prev) => [...prev, payload]);
        };

        const handlePending = () => {
            setIsPending(true);
        };

        const handleApproved = () => {
            setIsPending(false);
            toast.success("Access granted!");
        };

        const handleRejected = () => {
            setIsPending(false);
            toast.error("Access denied by host");
            router.push("/");
        };

        socket.on(EVENTS.JOIN_REQUEST_RECEIVED, handleRequest);
        socket.on(EVENTS.JOIN_PENDING, handlePending);
        socket.on(EVENTS.JOIN_APPROVED, handleApproved);
        socket.on(EVENTS.JOIN_REJECTED, handleRejected);

        return () => {
            socket.off(EVENTS.JOIN_REQUEST_RECEIVED, handleRequest);
            socket.off(EVENTS.JOIN_PENDING, handlePending);
            socket.off(EVENTS.JOIN_APPROVED, handleApproved);
            socket.off(EVENTS.JOIN_REJECTED, handleRejected);
        };
    }, [socket, router]);

    const handleDecision = (userId: string, approved: boolean) => {
        if (!socket || !roomId) return;
        socket.emit(EVENTS.JOIN_DECISION, { roomId, userId, approved });
        setJoinRequests((prev) => prev.filter((req) => req.userId !== userId));
        if (approved) toast.success("Request accepted");
        else toast.info("Request rejected");
    };

    // Debug Logs
    console.log("DEBUG RENDER:", {
        joinRequestsLen: joinRequests.length,
        hostId: room?.hostId,
        socketId: socket?.id,
        isHost: room?.hostId === socket?.id
    });

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

    if (!room && !isPending) {
        return <LoadingScreen message="Entering Session..." />;
    }

    if (isPending) {
        return (
            <main className="min-h-screen bg-white dark:bg-black flex items-center justify-center text-black dark:text-white p-4 transition-colors duration-300">
                <div className="text-center max-w-md space-y-6 animate-pulse">
                    <div className="text-4xl mb-4 font-serif italic">Waiting...</div>
                    <div className="space-y-2">
                        <h2 className="text-xl font-serif uppercase tracking-tight">Host Approval Required</h2>
                        <p className="text-gray-500 dark:text-gray-400 font-sans text-sm tracking-wide">
                            Please wait while the host reviews your request to join.
                        </p>
                    </div>
                </div>
            </main>
        );
    }





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

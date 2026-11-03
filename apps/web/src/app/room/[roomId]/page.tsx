"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSocket } from "../../../context/SocketContext";
import { useAuth } from "../../../context/AuthContext";
import { toast } from "sonner";
import { EVENTS } from "@tuneverse/shared";
import ActiveRoom from "../../../components/ActiveRoom";
import LoadingScreen from "../../../components/LoadingScreen";
import Button from "../../../components/Button";
import Spinner from "../../../components/Spinner";
import { startNavigationProgress } from "../../../components/NavigationProgress";

export default function RoomPage() {
    const { roomId } = useParams();
    const { socket, room, isConnected, error, fingerprint, leaveRoom } = useSocket();
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const [joinRequests, setJoinRequests] = useState<{ userId: string; username: string }[]>([]);
    const [isPending, setIsPending] = useState(false);

    useEffect(() => {
        if (!user && !isLoading) {
            const callbackUrl = `/room/${roomId}`;
            router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
            return;
        }

        if (!socket || !isConnected || !user || !roomId) return;

        // If we are not in the room yet (e.g. refresh), join it
        if (!room || room.id !== roomId) {
            socket.emit(EVENTS.ROOM_JOIN, { roomId, username: user.username, fingerprint });
        }
    }, [socket, isConnected, user, roomId, room, isLoading, router, fingerprint]);

    useEffect(() => {
        if (!socket) return;

        const handleRequest = (payload: { roomId: string; username: string; userId: string }) => {
            toast(`${payload.username} wants to come in`, { id: `join-${payload.username}` });
            // A refresh gives them a new socket id, so match on the name.
            setJoinRequests((prev) => [...prev.filter((req) => req.username !== payload.username), payload]);
        };

        const handlePending = () => {
            setIsPending(true);
        };

        const handleApproved = () => {
            setIsPending(false);
            toast("You're in");
        };

        const handleRejected = () => {
            setIsPending(false);
            toast("The host said not this time");
            router.push("/lobby");
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
    };

    const backToLobby = () => {
        startNavigationProgress();
        leaveRoom();
        router.push("/lobby");
    };

    if (error) {
        return (
            <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
                <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">This room isn&apos;t <em>here</em></h1>
                <p className="mt-3 max-w-md text-lg text-muted-foreground">It may have ended, or the code might be wrong. Check it and try again.</p>
                <Button onClick={backToLobby} className="mt-6">Back to the lobby</Button>
            </main>
        );
    }

    if (isPending) {
        return (
            <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
                <Spinner className="text-3xl text-signal" />
                <h1 className="mt-5 text-4xl font-semibold tracking-tight md:text-5xl">Knock <em>knock</em></h1>
                <p className="mt-3 max-w-md text-lg text-muted-foreground">The host needs to let you in. This page will open by itself once they do.</p>
                <Button variant="outline" onClick={backToLobby} className="mt-6">Never mind</Button>
            </main>
        );
    }

    if (!room) {
        return <LoadingScreen message="Finding your room" />;
    }

    const request = joinRequests[0];

    return (
        <main className="relative min-h-screen">
            {request && room.hostId === socket?.id && (
                <div className="dropdown-enter fixed inset-x-0 top-0 z-50 flex flex-wrap items-center justify-between gap-3 bg-accent px-5 py-3.5 text-accent-foreground shadow-xl md:px-10">
                    <p className="text-lg">
                        <span className="font-semibold">{request.username}</span> wants to come in
                        {joinRequests.length > 1 && <span className="opacity-70"> (+{joinRequests.length - 1} more)</span>}
                    </p>
                    <div className="flex gap-3 text-sm">
                        <button onClick={() => handleDecision(request.userId, true)} className="rounded-full bg-signal px-5 py-2 font-medium text-signal-foreground transition-opacity hover:opacity-90">
                            Let them in
                        </button>
                        <button onClick={() => handleDecision(request.userId, false)} className="rounded-full border border-current px-5 py-2 transition-opacity hover:opacity-70">
                            Not now
                        </button>
                    </div>
                </div>
            )}

            <ActiveRoom username={user?.username || "Guest"} />
        </main>
    );
}

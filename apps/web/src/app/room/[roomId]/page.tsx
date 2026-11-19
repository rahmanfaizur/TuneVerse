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
import PosterMessage from "../../../components/poster/PosterMessage";
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
        // A dropped connection is not the same as a room that's gone.
        const isConnectionProblem = error.startsWith("Connection failed");
        return (
            <PosterMessage
                headline={isConnectionProblem ? "Lost the signal" : "This room isn't here"}
                text={isConnectionProblem
                    ? "We can't reach the server. It might be waking up. Give it a moment and try again."
                    : "It may have ended, or the code might be wrong. Check it and try again."}
            >
                {isConnectionProblem && <Button onClick={() => window.location.reload()}>Try again</Button>}
                <Button variant={isConnectionProblem ? "quiet" : "primary"} onClick={backToLobby}>Back to the lobby</Button>
            </PosterMessage>
        );
    }

    if (isPending) {
        return (
            <PosterMessage label="At the door" headline="Knock knock" text="The host needs to let you in. This page opens by itself once they do.">
                <Spinner className="text-2xl text-ink" />
                <Button variant="outline" onClick={backToLobby}>Never mind</Button>
            </PosterMessage>
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

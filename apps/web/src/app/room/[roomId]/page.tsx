"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSocket } from "../../../../context/SocketContext";
import { EVENTS } from "@tuneverse/shared";
import ActiveRoom from "../../../components/ActiveRoom";

export default function RoomPage() {
    const { roomId } = useParams();
    const { socket, room, isConnected } = useSocket();
    const router = useRouter();
    const [username, setUsername] = useState("");

    useEffect(() => {
        const storedUser = localStorage.getItem("tuneverse_user");
        if (!storedUser) {
            router.push("/");
            return;
        }
        setUsername(storedUser);
    }, [router]);

    useEffect(() => {
        if (!socket || !isConnected || !username || !roomId) return;

        // If we are not in the room yet (e.g. refresh), join it
        if (!room || room.id !== roomId) {
            console.log(`🔄 Auto-joining room ${roomId} as ${username}`);
            socket.emit(EVENTS.ROOM_JOIN, { roomId, username });
        }
    }, [socket, isConnected, username, roomId, room]);

    if (!room) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
                    <p>Joining Room...</p>
                </div>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-gray-900 p-6">
            <ActiveRoom username={username} />
        </main>
    );
}

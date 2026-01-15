"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSocket } from "../../../../context/SocketContext";
import { EVENTS } from "@tuneverse/shared";
import ActiveRoom from "../../../components/ActiveRoom";

export default function RoomPage() {
    const { roomId } = useParams();
    const { socket, room, isConnected, error } = useSocket(); // <--- Get error
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
        return (
            <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center text-black dark:text-white transition-colors duration-300">
                <div className="text-center space-y-4">
                    <div className="w-12 h-12 border-2 border-gray-200 dark:border-gray-800 border-t-black dark:border-t-white rounded-full animate-spin mx-auto"></div>
                    <p className="text-xs font-sans uppercase tracking-widest text-gray-400 dark:text-gray-500">Entering Session...</p>
                </div>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-white dark:bg-black p-6 transition-colors duration-300">
            <ActiveRoom username={username} />
        </main>
    );
}

"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { EVENTS, Room } from "@tuneverse/shared"; // Import Room type

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
    room: Room | null; // <--- NEW: Track current room
}

const SocketContext = createContext<SocketContextType>({
    socket: null,
    isConnected: false,
    room: null,
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [room, setRoom] = useState<Room | null>(null); // <--- NEW

    useEffect(() => {
        const socketInstance = io("http://localhost:4000", {
            autoConnect: false,
        });

        setSocket(socketInstance);

        socketInstance.on("connect", () => {
            setIsConnected(true);
        });

        socketInstance.on("disconnect", () => {
            setIsConnected(false);
            setRoom(null); // Reset room on disconnect
        });

        // --- LISTENER FOR ROOM UPDATES ---
        socketInstance.on(EVENTS.ROOM_UPDATE, (updatedRoom: Room) => {
            console.log("🏠 Room Updated:", updatedRoom);
            setRoom(updatedRoom);
        });

        return () => {
            socketInstance.disconnect();
        };
    }, []);

    return (
        <SocketContext.Provider value={{ socket, isConnected, room }}>
            {children}
        </SocketContext.Provider>
    );
};

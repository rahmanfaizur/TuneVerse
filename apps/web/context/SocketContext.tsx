"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { EVENTS, Room } from "@tuneverse/shared"; // Import Room type

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
    room: Room | null;
    login: (username: string) => void;
    logout: () => void;
}

const SocketContext = createContext<SocketContextType>({
    socket: null,
    isConnected: false,
    room: null,
    login: () => { },
    logout: () => { },
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [room, setRoom] = useState<Room | null>(null); // <--- NEW

    useEffect(() => {
        // Smart Fallback: Use current hostname (e.g., 192.168.x.x) if env var is missing
        const protocol = window.location.protocol;
        const host = window.location.hostname;
        const socketUrl = process.env.NEXT_PUBLIC_API_URL || `${protocol}//${host}:4000`;

        const socketInstance = io(socketUrl, {
            autoConnect: false,
        });

        setSocket(socketInstance);

        socketInstance.on("connect", () => {
            setIsConnected(true);
        });

        socketInstance.on("disconnect", () => {
            setIsConnected(false);
            setRoom(null);
        });

        socketInstance.on(EVENTS.ROOM_UPDATE, (updatedRoom: Room) => {
            console.log("🏠 Room Updated:", updatedRoom);
            setRoom(updatedRoom);
        });

        // Auto-login check
        const storedUser = localStorage.getItem("tuneverse_user");
        if (storedUser) {
            socketInstance.auth = { username: storedUser };
            socketInstance.connect();
        }

        return () => {
            socketInstance.disconnect();
        };
    }, []);

    const login = (username: string) => {
        if (!socket) return;
        localStorage.setItem("tuneverse_user", username);
        socket.auth = { username };
        socket.connect();
    };

    const logout = () => {
        if (!socket) return;
        localStorage.removeItem("tuneverse_user");
        socket.disconnect();
        setRoom(null);
    };

    return (
        <SocketContext.Provider value={{ socket, isConnected, room, login, logout }}>
            {children}
        </SocketContext.Provider>
    );
};

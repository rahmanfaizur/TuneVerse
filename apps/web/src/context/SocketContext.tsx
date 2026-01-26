"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { EVENTS, Room } from "@tuneverse/shared"; // Import Room type

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
    room: Room | null;
    error: string | null; // <--- NEW
    login: (username: string) => void;
    logout: () => void;
}

const SocketContext = createContext<SocketContextType>({
    socket: null,
    isConnected: false,
    room: null,
    error: null,
    login: () => { },
    logout: () => { },
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [room, setRoom] = useState<Room | null>(null);
    const [error, setError] = useState<string | null>(null); // <--- NEW

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
            setError(null); // Clear error on connect
        });

        socketInstance.on("disconnect", () => {
            setIsConnected(false);
            setRoom(null);
        });

        socketInstance.on(EVENTS.ROOM_UPDATE, (updatedRoom: Room) => {
            console.log("🏠 Room Updated:", updatedRoom);
            setRoom(updatedRoom);
            setError(null); // Clear error on successful update
        });

        socketInstance.on(EVENTS.ERROR, (payload: { message: string }) => {
            console.error("🚨 Socket Error:", payload.message);
            setError(payload.message);
        });

        socketInstance.on("connect_error", (err) => {
            console.error("🚨 Connection Error:", err.message);
            setError(`Connection failed: ${err.message}`);
            setIsConnected(false);
        });

        // Auto-login check
        const storedUser = localStorage.getItem("tuneverse_user");
        if (storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                if (parsedUser && parsedUser.username) {
                    socketInstance.auth = { username: parsedUser.username };
                    socketInstance.connect();
                }
            } catch (e) {
                console.error("Socket auto-login failed", e);
            }
        }

        return () => {
            socketInstance.disconnect();
        };
    }, []);

    const login = (username: string) => {
        if (!socket) return;
        // localStorage.setItem("tuneverse_user", username); // REMOVED: AuthContext manages this
        socket.auth = { username };
        socket.connect();
    };

    const logout = () => {
        if (!socket) return;
        // localStorage.removeItem("tuneverse_user"); // REMOVED: AuthContext manages this
        socket.disconnect();
        setRoom(null);
    };

    return (
        <SocketContext.Provider value={{ socket, isConnected, room, error, login, logout }}>
            {children}
        </SocketContext.Provider>
    );
};

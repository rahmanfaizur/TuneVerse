"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";
import { EVENTS, PublicRoom } from "@tuneverse/shared";

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
    room: PublicRoom | null;
    error: string | null; // <--- NEW
    fingerprint: string | null; // <--- NEW
    login: (username: string) => void;
    logout: () => void;
    leaveRoom: () => void;
}

const SocketContext = createContext<SocketContextType>({
    socket: null,
    isConnected: false,
    room: null,
    error: null,
    fingerprint: null,
    login: () => { },
    logout: () => { },
    leaveRoom: () => { },
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [room, setRoom] = useState<PublicRoom | null>(null);
    const [error, setError] = useState<string | null>(null); // <--- NEW
    const [fingerprint, setFingerprint] = useState<string | null>(null); // <--- NEW

    useEffect(() => {
        // Initialize or get Fingerprint
        let currentFingerprint = localStorage.getItem('tuneverse_fingerprint');
        if (!currentFingerprint) {
            currentFingerprint = Array.from(crypto.getRandomValues(new Uint8Array(16)))
                .map(b => b.toString(16).padStart(2, '0')).join('');
            localStorage.setItem('tuneverse_fingerprint', currentFingerprint);
        }
        setFingerprint(currentFingerprint);
        // Smart Fallback: Use current hostname (e.g., 192.168.x.x) if env var is missing
        const protocol = window.location.protocol;
        const host = window.location.hostname;
        const socketUrl = process.env.NEXT_PUBLIC_API_URL || `${protocol}//${host}:4000`;

        const socketInstance = io(socketUrl, {
            autoConnect: false,
            transports: ["websocket", "polling"],
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

        socketInstance.on(EVENTS.ROOM_UPDATE, (updatedRoom: PublicRoom) => {
            setRoom(updatedRoom);
            setError(null); // Clear error on successful update
        });

        socketInstance.on(EVENTS.ERROR, (payload: { message: string }) => {
            console.error("🚨 Socket Error:", payload.message);
            setError(payload.message);
        });

        socketInstance.on(EVENTS.NOTICE, (payload: { message: string }) => {
            toast(payload.message);
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

    // Without clearing this, coming back to the same room would skip joining it again.
    const leaveRoom = useCallback(() => {
        socket?.emit(EVENTS.ROOM_LEAVE);
        setRoom(null);
        setError(null);
    }, [socket]);

    return (
        <SocketContext.Provider value={{ socket, isConnected, room, error, fingerprint, login, logout, leaveRoom }}>
            {children}
        </SocketContext.Provider>
    );
};

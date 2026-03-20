import { useEffect, useState } from "react";

interface Room {
    id: string;
    name?: string;
    hostId: string;
    users: { id: string; username: string }[];
}

import { useAuth } from "../context/AuthContext";

interface RoomListProps {
    onJoin: (roomId: string) => void;
    refreshKey?: number;
    type?: "all" | "my";
}

export default function RoomList({ onJoin, refreshKey, type = "all" }: RoomListProps) {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);
    const { token } = useAuth();

    const fetchRooms = () => {
        setLoading(true);
        // Smart Fallback: Use current hostname (e.g., 192.168.x.x) if env var is missing
        const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';
        const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || `${protocol}//${host}:4000`;

        const endpoint = type === "my" ? "/api/rooms/my" : "/api/rooms";

        fetch(`${apiUrl}${endpoint}`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        })
            .then((res) => {
                if (!res.ok) throw new Error("Failed to fetch");
                return res.json();
            })
            .then((data) => {
                setRooms(data);
                setLoading(false);
            })
            .catch((err) => {
                console.error("Failed to fetch rooms", err);
                setLoading(false);
            });
    };

    useEffect(() => {
        if (token) {
            fetchRooms();
        }
    }, [refreshKey, type, token]);

    if (loading) return <div className="text-gray-400 text-xs text-center font-sans tracking-widest uppercase">Loading rooms...</div>;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-end border-b border-border pb-2">
                <h3 className="text-foreground font-serif text-xl uppercase tracking-widest">Active Sessions</h3>
                <button
                    onClick={fetchRooms}
                    className="text-[10px] font-sans uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                >
                    Refresh List
                </button>
            </div>
            {rooms.length === 0 ? (
                <div className="text-muted-foreground text-xs font-sans tracking-widest uppercase text-center py-8">No active sessions found.</div>
            ) : (
                <div className="divide-y divide-border/50">
                    {rooms.map((room) => {
                        const hostName = room.users.find(u => u.id === room.hostId)?.username || "Unknown";
                        return (
                            <div
                                key={room.id}
                                className="py-6 flex flex-col sm:flex-row sm:items-center justify-between group gap-4 sm:gap-0"
                            >
                                <div>
                                    <p className="text-foreground font-serif text-2xl uppercase tracking-tighter leading-none group-hover:italic transition-all break-words">
                                        {room.name || `Session ${room.id}`}
                                    </p>
                                    <p className="text-muted-foreground text-[10px] uppercase tracking-[0.2em] mt-2">
                                        Host: {hostName} • {room.users.length} Users
                                    </p>
                                </div>
                                <button
                                    onClick={() => onJoin(room.id)}
                                    className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] border border-border px-6 py-3 hover:bg-accent hover:text-accent-foreground hover:border-accent transition-all text-foreground w-full sm:w-auto text-center"
                                >
                                    Join Session
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

import { useEffect, useState } from "react";

interface Room {
    id: string;
    name?: string;
    hostId: string;
    users: { id: string; username: string }[];
}

interface RoomListProps {
    onJoin: (roomId: string) => void;
    refreshKey?: number;
}

export default function RoomList({ onJoin, refreshKey }: RoomListProps) {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchRooms = () => {
        setLoading(true);
        // Smart Fallback: Use current hostname (e.g., 192.168.x.x) if env var is missing
        const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';
        const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || `${protocol}//${host}:4000`;

        fetch(`${apiUrl}/api/rooms`)
            .then((res) => res.json())
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
        fetchRooms();
    }, [refreshKey]);

    if (loading) return <div className="text-gray-400 text-xs text-center font-sans tracking-widest uppercase">Loading rooms...</div>;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-end border-b border-black dark:border-white pb-2">
                <h3 className="text-black dark:text-white font-serif text-xl italic">Active Sessions</h3>
                <button
                    onClick={fetchRooms}
                    className="text-[10px] font-sans uppercase tracking-widest hover:opacity-50 transition text-black dark:text-white"
                >
                    Refresh List
                </button>
            </div>
            {rooms.length === 0 ? (
                <div className="text-gray-400 text-sm font-serif italic text-center py-4">No active sessions found.</div>
            ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {rooms.map((room) => {
                        const hostName = room.users.find(u => u.id === room.hostId)?.username || "Unknown";
                        return (
                            <div
                                key={room.id}
                                className="py-4 flex items-center justify-between group"
                            >
                                <div>
                                    <p className="text-black dark:text-white font-serif text-lg leading-none group-hover:italic transition-all">
                                        {room.name || `Session ${room.id}`}
                                    </p>
                                    <p className="text-gray-400 text-[10px] uppercase tracking-widest mt-1">
                                        Host: {hostName} • {room.users.length} Users
                                    </p>
                                </div>
                                <button
                                    onClick={() => onJoin(room.id)}
                                    className="text-xs font-sans font-bold uppercase tracking-widest border border-black dark:border-white px-4 py-2 hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black transition text-black dark:text-white"
                                >
                                    Join
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

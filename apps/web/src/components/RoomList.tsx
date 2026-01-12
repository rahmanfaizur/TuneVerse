import { useEffect, useState } from "react";

interface Room {
    id: string;
    name: string;
    host: { username: string };
    participants: { id: string }[];
}

interface RoomListProps {
    onJoin: (roomId: string) => void;
}

export default function RoomList({ onJoin }: RoomListProps) {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("http://localhost:4000/api/rooms")
            .then((res) => res.json())
            .then((data) => {
                setRooms(data);
                setLoading(false);
            })
            .catch((err) => {
                console.error("Failed to fetch rooms", err);
                setLoading(false);
            });
    }, []);

    if (loading) return <div className="text-gray-400 text-sm">Loading rooms...</div>;

    return (
        <div className="space-y-2">
            <h3 className="text-gray-400 text-xs font-bold uppercase mb-2">Active Rooms</h3>
            {rooms.length === 0 ? (
                <div className="text-gray-500 text-sm italic">No active rooms found.</div>
            ) : (
                rooms.map((room) => (
                    <div
                        key={room.id}
                        className="bg-gray-800/50 p-3 rounded-lg flex items-center justify-between hover:bg-gray-800 transition border border-gray-700"
                    >
                        <div>
                            <p className="text-gray-200 font-bold text-sm">{room.name}</p>
                            <p className="text-gray-500 text-xs">Host: {room.host.username} • {room.participants.length} Users</p>
                        </div>
                        <button
                            onClick={() => onJoin(room.id)}
                            className="bg-purple-600 hover:bg-purple-500 text-white text-xs px-3 py-1.5 rounded font-bold transition"
                        >
                            JOIN
                        </button>
                    </div>
                ))
            )}
        </div>
    );
}

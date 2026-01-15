import { useState, useEffect, useRef } from "react";
import { EVENTS, Room } from "@tuneverse/shared";
import { Socket } from "socket.io-client";

interface QueueSystemProps {
    room: Room;
    socket: Socket | null;
}

interface SearchResult {
    id: string;
    title: string;
    thumbnail: string;
    channelTitle: string;
}

// Simple debounce hook
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
}

export default function QueueSystem({ room, socket }: QueueSystemProps) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const debouncedQuery = useDebounce(query, 500);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const queue = room.queue || [];

    // Handle outside click to close dropdown
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Search Effect
    useEffect(() => {
        if (!debouncedQuery.trim() || !socket) {
            setResults([]);
            return;
        }

        setIsSearching(true);
        socket.emit(EVENTS.SEARCH_QUERY, { query: debouncedQuery });
        setShowDropdown(true);
    }, [debouncedQuery, socket]);

    // Listen for results
    useEffect(() => {
        if (!socket) return;

        const handleResults = (data: SearchResult[]) => {
            setResults(data);
            setIsSearching(false);
        };

        socket.on(EVENTS.SEARCH_RESULTS, handleResults);
        return () => {
            socket.off(EVENTS.SEARCH_RESULTS, handleResults);
        };
    }, [socket]);

    const handleAdd = (video: SearchResult) => {
        if (!socket) return;
        socket.emit(EVENTS.QUEUE_ADD, { videoId: video.id });
        setQuery("");
        setResults([]);
        setShowDropdown(false);
    };

    const handleDelete = (index: number) => {
        if (!socket) return;
        socket.emit(EVENTS.QUEUE_REMOVE, { roomId: room.id, index });
    };

    return (
        <div className="flex flex-col h-full relative" ref={wrapperRef}>
            <h3 className="font-serif italic text-lg mb-4 text-black dark:text-white">Queue</h3>

            {/* Search Input */}
            <div className="relative mb-6 z-20">
                <input
                    type="text"
                    placeholder="SEARCH YOUTUBE"
                    className="w-full py-2 bg-transparent border-b border-black dark:border-white outline-none font-sans text-xs uppercase tracking-widest placeholder:text-gray-400 dark:placeholder:text-gray-500 text-black dark:text-white focus:border-b-2 transition-all"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => {
                        if (results.length > 0) setShowDropdown(true);
                    }}
                />
                {isSearching && (
                    <div className="absolute right-0 top-2">
                        <div className="w-3 h-3 border-2 border-black dark:border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}

                {/* Dropdown Results */}
                {showDropdown && results.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-black border border-black dark:border-white shadow-xl max-h-80 overflow-y-auto">
                        {results.map((video) => (
                            <button
                                key={video.id}
                                onClick={() => handleAdd(video)}
                                className="w-full text-left p-3 hover:bg-gray-100 dark:hover:bg-gray-900 flex gap-3 items-center group transition-colors border-b border-gray-100 dark:border-gray-800 last:border-0"
                            >
                                <img
                                    src={video.thumbnail}
                                    alt={video.title}
                                    className="w-16 h-9 object-cover grayscale group-hover:grayscale-0 transition-all"
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="font-serif text-sm truncate text-black dark:text-white group-hover:italic">
                                        {video.title}
                                    </p>
                                    <p className="text-[9px] uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        {video.channelTitle}
                                    </p>
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition text-black dark:text-white">
                                    Add
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Queue List */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 z-10">
                {queue.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 dark:text-gray-600">
                        <p className="font-serif italic text-sm">The queue is empty.</p>
                        <p className="text-[10px] font-sans uppercase tracking-widest mt-1">Search to add a vibe.</p>
                    </div>
                ) : (
                    queue.map((video, index) => (
                        <div key={`${video.id}-${index}`} className="group flex gap-3 items-start">
                            <div className="w-6 text-[10px] font-mono text-gray-400 dark:text-gray-600 pt-1">
                                {(index + 1).toString().padStart(2, '0')}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-serif text-sm leading-tight truncate text-black dark:text-white group-hover:underline decoration-1 underline-offset-2">
                                    {video.title}
                                </p>
                                <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 mt-1">
                                    Added by {video.addedBy}
                                </p>
                            </div>
                            {/* Delete button (only for host or adder) */}
                            {(room.hostId === socket?.id || video.addedBy === socket?.id) && (
                                <button
                                    onClick={() => handleDelete(index)}
                                    className="opacity-0 group-hover:opacity-100 text-[10px] uppercase tracking-widest text-red-500 hover:text-red-600 transition"
                                >
                                    Remove
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

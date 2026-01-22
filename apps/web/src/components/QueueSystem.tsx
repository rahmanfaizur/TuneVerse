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
    const [recommendations, setRecommendations] = useState<SearchResult[]>([]);
    const [isLoadingRecs, setIsLoadingRecs] = useState(false);
    const [showRecs, setShowRecs] = useState(false);
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

        const handleRecommendations = (data: SearchResult[]) => {
            setRecommendations(data);
            setIsLoadingRecs(false);
            setShowRecs(true);
        };

        socket.on(EVENTS.SEARCH_RESULTS, handleResults);
        socket.on(EVENTS.RECOMMENDATIONS_RESULTS, handleRecommendations);
        return () => {
            socket.off(EVENTS.SEARCH_RESULTS, handleResults);
            socket.off(EVENTS.RECOMMENDATIONS_RESULTS, handleRecommendations);
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

    const handleGetRecommendations = () => {
        if (!socket || isLoadingRecs) return;
        setIsLoadingRecs(true);
        setShowRecs(false);
        socket.emit(EVENTS.RECOMMENDATIONS_REQUEST);
    };

    return (
        <div className="flex flex-col h-full relative" ref={wrapperRef}>
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif italic text-lg text-black dark:text-white">Queue</h3>
                <button
                    onClick={handleGetRecommendations}
                    disabled={isLoadingRecs}
                    className="text-[9px] uppercase tracking-widest px-3 py-1.5 border border-black dark:border-white text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoadingRecs ? "Analyzing..." : "🤖 Discover"}
                </button>
            </div>

            {/* AI Recommendations Panel */}
            {showRecs && recommendations.length > 0 && (
                <div className="mb-4 border border-black dark:border-white p-3 bg-gray-50 dark:bg-gray-900/50">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] uppercase tracking-widest text-gray-600 dark:text-gray-400">
                            🎵 AI Recommended ({recommendations.length})
                        </p>
                        <button
                            onClick={() => setShowRecs(false)}
                            className="text-[9px] uppercase tracking-widest text-gray-500 hover:text-black dark:hover:text-white"
                        >
                            Close
                        </button>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {recommendations.map((video) => (
                            <button
                                key={video.id}
                                onClick={() => {
                                    handleAdd(video);
                                    // Remove from recommendations after adding
                                    setRecommendations(prev => prev.filter(v => v.id !== video.id));
                                }}
                                className="w-full text-left p-2 hover:bg-white dark:hover:bg-gray-800 flex gap-2 items-center group transition-colors border-b border-gray-200 dark:border-gray-700 last:border-0"
                            >
                                <img
                                    src={video.thumbnail}
                                    alt={video.title}
                                    className="w-12 h-7 object-cover grayscale group-hover:grayscale-0 transition-all"
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="font-serif text-xs truncate text-black dark:text-white">
                                        {video.title}
                                    </p>
                                    <p className="text-[8px] uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        {video.channelTitle}
                                    </p>
                                </div>
                                <span className="text-[9px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition text-black dark:text-white">
                                    +
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

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

                            {/* Upvote Button */}
                            <div className="flex flex-col items-center">
                                <button
                                    onClick={() => {
                                        if (!socket) return;
                                        socket.emit(EVENTS.QUEUE_UPVOTE, { videoId: video.id });
                                    }}
                                    className={`text-xs hover:scale-110 transition ${video.voters?.includes(socket?.id || "") ? "text-blue-500" : "text-gray-400 dark:text-gray-600"}`}
                                >
                                    👍
                                </button>
                                <span className="text-[9px] font-mono text-gray-400">{video.votes || 0}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div >
    );
}

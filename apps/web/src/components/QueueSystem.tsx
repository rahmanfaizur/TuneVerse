import { useState, useEffect, useRef } from "react";
import { EVENTS, Room } from "@tuneverse/shared";
import { Socket } from "socket.io-client";
import { toast } from "sonner";

import { useSpotify } from "../context/SpotifyContext";

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
    const [source, setSource] = useState<'youtube' | 'spotify'>('youtube');
    const { spotifyToken, isConnected: spotifyConnected } = useSpotify();
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

        if (source === 'youtube') {
            socket.emit(EVENTS.SEARCH_QUERY, { query: debouncedQuery });
        } else if (source === 'spotify' && spotifyConnected) {
            // Use backend proxy for Spotify search to avoid exposing tokens if needed, 
            // or use the token we have in context to search directly?
            // The plan says "Spotify Routes ... GET /api/spotify/search".
            // Let's use the backend route to keep it consistent with the plan.
            fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000'}/api/spotify/search?q=${encodeURIComponent(debouncedQuery)}`, {
                headers: {
                    'Authorization': `Bearer ${spotifyToken}`
                }
            })
                .then(res => res.json())
                .then(data => {
                    setResults(data);
                    setIsSearching(false);
                })
                .catch(err => {
                    console.error("Spotify search failed", err);
                    setIsSearching(false);
                });
        }

        setShowDropdown(true);
    }, [debouncedQuery, socket, source, spotifyConnected, spotifyToken]);

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



        const handleError = (payload: { message: string }) => {
            setIsLoadingRecs(false);
            if (payload.message.includes("cooling down")) {
                toast.error(payload.message);
            }
        };

        socket.on(EVENTS.SEARCH_RESULTS, handleResults);
        socket.on(EVENTS.RECOMMENDATIONS_RESULTS, handleRecommendations);
        socket.on(EVENTS.ERROR, handleError);
        return () => {
            socket.off(EVENTS.SEARCH_RESULTS, handleResults);
            socket.off(EVENTS.RECOMMENDATIONS_RESULTS, handleRecommendations);
            socket.off(EVENTS.ERROR, handleError);
        };
    }, [socket]);

    const handleAdd = (video: SearchResult) => {
        if (!socket) return;
        // If source is Spotify, we need to send different payload or handle it on backend
        // The backend queue item has `source` field.
        // We should probably emit a generic ADD event and let backend handle, 
        // BUT the current QUEUE_ADD event expects `videoId`.
        // We need to update the payload to include source.
        // Let's check `packages/shared/src/types.ts` again.
        // It says `AddToQueuePayload` has `videoId` and `title`.
        // We might need to update that or overload `videoId` with spotify URI?
        // Actually, let's send `source` in the payload if possible, or just send the ID and let backend figure it out?
        // Backend `addToQueue` takes a `Video` object.
        // Wait, `QUEUE_ADD` event handler in backend probably constructs the video object.
        // Let's assume we need to send source.

        socket.emit(EVENTS.QUEUE_ADD, {
            videoId: video.id,
            title: video.title,
            thumbnail: video.thumbnail,
            source: (video as any).source || source, // Use video source if available (recommendations), else toggle state
            uri: (video as any).uri, // Spotify URI
            artist: (video as any).artist,
            album: (video as any).album
        });
        setQuery("");
        setResults([]);
        setShowDropdown(false);
    };

    const handleDelete = (index: number) => {
        if (!socket) return;
        socket.emit(EVENTS.QUEUE_REMOVE, { roomId: room.id, index });
    };

    const [showMoodSelector, setShowMoodSelector] = useState(false);
    const [customMood, setCustomMood] = useState("");

    const MOODS = ["Chill", "Party", "Focus", "Energetic", "Late Night"];

    const handleGetRecommendations = (mood?: string) => {
        if (!socket || isLoadingRecs) return;
        setIsLoadingRecs(true);
        setShowRecs(false);
        setShowMoodSelector(false);
        socket.emit(EVENTS.RECOMMENDATIONS_REQUEST, { spotifyToken, mood });
    };

    return (
        <div className="flex flex-col h-full relative" ref={wrapperRef}>
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif italic text-lg text-foreground">Queue</h3>
                <div className="relative">
                    <button
                        onClick={() => setShowMoodSelector(!showMoodSelector)}
                        disabled={isLoadingRecs}
                        className="text-[9px] uppercase tracking-widest px-3 py-1.5 border border-border text-foreground hover:bg-foreground hover:text-background transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoadingRecs ? "Analyzing..." : "🤖 Discover"}
                    </button>

                    {/* Mood Selector Popover */}
                    {showMoodSelector && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-background border border-border shadow-xl z-50 p-2 animate-in fade-in zoom-in-95 duration-200">
                            <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-2 px-1">Select Vibe</p>
                            <div className="grid grid-cols-1 gap-1">
                                {MOODS.map(mood => (
                                    <button
                                        key={mood}
                                        onClick={() => handleGetRecommendations(mood)}
                                        className="text-left px-2 py-1.5 text-xs font-serif hover:bg-muted transition-colors text-foreground"
                                    >
                                        {mood}
                                    </button>
                                ))}
                            </div>
                            <div className="mt-2 pt-2 border-t border-border/50">
                                <input
                                    type="text"
                                    placeholder="Custom..."
                                    className="w-full px-2 py-1 text-xs bg-transparent border border-border/50 focus:border-border outline-none transition-colors text-foreground placeholder-muted-foreground"
                                    value={customMood}
                                    onChange={(e) => setCustomMood(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && customMood.trim()) {
                                            handleGetRecommendations(customMood);
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* AI Recommendations Panel */}
            {showRecs && recommendations.length > 0 && (
                <div className="mb-4 border border-border p-3 bg-muted/30">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                            🎵 AI Recommended ({recommendations.length})
                        </p>
                        <button
                            onClick={() => setShowRecs(false)}
                            className="text-[9px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Close
                        </button>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {recommendations.map((video) => (
                            <button
                                key={video.id}
                                onClick={() => {
                                    handleAdd(video);
                                    // Remove from recommendations after adding
                                    setRecommendations(prev => prev.filter(v => v.id !== video.id));
                                }}
                                className="w-full text-left p-2 hover:bg-muted flex gap-2 items-center group transition-colors border-b border-border/30 last:border-0"
                            >
                                <img
                                    src={video.thumbnail}
                                    alt={video.title}
                                    className="w-12 h-7 object-cover grayscale group-hover:grayscale-0 transition-all opacity-80 group-hover:opacity-100"
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="font-serif text-xs truncate text-foreground group-hover:italic transition-all">
                                        {video.title}
                                    </p>
                                    <p className="text-[8px] uppercase tracking-wider text-muted-foreground">
                                        {video.channelTitle}
                                    </p>
                                </div>
                                <span className="text-[9px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition text-foreground">
                                    +
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Source Toggle */}
            <div className="flex gap-4 mb-2 z-20 relative">
                <button
                    onClick={() => setSource('youtube')}
                    className={`text-[9px] font-bold uppercase tracking-widest pb-1 border-b transition-colors ${source === 'youtube' ? 'border-border text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                    YouTube
                </button>
                <button
                    onClick={() => setSource('spotify')}
                    className={`text-[9px] font-bold uppercase tracking-widest pb-1 border-b transition-colors ${source === 'spotify' ? 'border-border text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                    Spotify
                </button>
            </div>

            {/* Search Input */}
            <div className="relative mb-6 z-20">
                <input
                    type="text"
                    placeholder={source === 'spotify' ? "SEARCH SPOTIFY" : "SEARCH YOUTUBE"}
                    className="w-full py-2 bg-transparent border-b border-border outline-none font-sans text-xs uppercase tracking-widest placeholder:text-muted-foreground text-foreground focus:border-foreground transition-all"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => {
                        if (results.length > 0) setShowDropdown(true);
                    }}
                />
                {isSearching && (
                    <div className="absolute right-0 top-2">
                        <div className="w-3 h-3 border-2 border-border border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}

                {/* Dropdown Results */}
                {showDropdown && results.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-border shadow-2xl max-h-80 overflow-y-auto">
                        {results.map((video) => (
                            <button
                                key={video.id}
                                onClick={() => handleAdd(video)}
                                className="w-full text-left p-3 hover:bg-muted flex gap-3 items-center group transition-colors border-b border-border/30 last:border-0"
                            >
                                <img
                                    src={video.thumbnail}
                                    alt={video.title}
                                    className="w-16 h-9 object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all border border-border/10"
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="font-serif text-sm truncate text-foreground group-hover:italic transition-all">
                                        {video.title}
                                    </p>
                                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5">
                                        {video.channelTitle}
                                    </p>
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition text-foreground bg-accent text-accent-foreground px-2 py-1">
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
                    <div className="text-center py-8 text-muted-foreground">
                        <p className="font-serif italic text-sm">The queue is empty.</p>
                        <p className="text-[10px] font-sans uppercase tracking-widest mt-1">Search to add a vibe.</p>
                    </div>
                ) : (
                    queue.map((video, index) => (
                        <div key={`${video.id}-${index}`} className="group flex gap-3 items-start p-2 hover:bg-muted/30 transition-colors border-b border-border/20 last:border-0">
                            <div className="w-6 text-[10px] font-mono text-muted-foreground pt-1">
                                {(index + 1).toString().padStart(2, '0')}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-serif text-sm leading-tight truncate text-foreground group-hover:underline decoration-1 underline-offset-2 transition-all">
                                    {video.title}
                                </p>
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
                                    Added by {video.addedBy}
                                </p>
                            </div>
                            {/* Delete button (only for host or adder) */}
                            {(room.hostId === socket?.id || video.addedBy === socket?.id) && (
                                <button
                                    onClick={() => handleDelete(index)}
                                    className="opacity-0 group-hover:opacity-100 text-[9px] uppercase tracking-widest text-red-500 hover:text-red-600 transition-all px-2 py-1 border border-transparent hover:border-red-500/30"
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
                                    className={`text-xs hover:scale-110 transition ${video.voters?.includes(socket?.id || "") ? "text-blue-500" : "text-muted-foreground hover:text-foreground"}`}
                                >
                                    👍
                                </button>
                                <span className="text-[9px] font-mono text-muted-foreground">{video.votes || 0}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div >
    );
}

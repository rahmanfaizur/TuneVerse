import { useState, useEffect } from "react";
import { Room, EVENTS, SearchResult } from "@tuneverse/shared";
import { Socket } from "socket.io-client";

interface QueueSystemProps {
    room: Room;
    socket: Socket | null;
}

export default function QueueSystem({ room, socket }: QueueSystemProps) {
    const [input, setInput] = useState("");
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Listen for search results
    useEffect(() => {
        if (!socket) return;

        const handleResults = (results: SearchResult[]) => {
            setSearchResults(results);
            setIsSearching(false);
        };

        socket.on(EVENTS.SEARCH_RESULTS, handleResults);
        return () => {
            socket.off(EVENTS.SEARCH_RESULTS, handleResults);
        };
    }, [socket]);

    // Debounced Search
    useEffect(() => {
        if (!socket || !input) {
            setSearchResults([]);
            return;
        }

        // If it looks like a URL, don't search
        if (input.includes("youtube.com") || input.includes("youtu.be")) return;

        const timer = setTimeout(() => {
            console.log("Searching:", input);
            setIsSearching(true);
            socket.emit(EVENTS.SEARCH_QUERY, { query: input });
        }, 500); // 500ms debounce

        return () => clearTimeout(timer);
    }, [input, socket]);

    // Helper: Extract Video ID from URL (Regex)
    const getYoutubeId = (url: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const handleSubmit = () => {
        if (!socket || !input) return;

        const videoId = getYoutubeId(input);

        if (videoId) {
            // It's a direct URL
            console.log("Adding URL:", videoId);
            socket.emit(EVENTS.QUEUE_ADD, { videoId });
            setInput("");
            setSearchResults([]);
        }
    };

    const handleAddResult = (video: SearchResult) => {
        if (!socket) return;
        socket.emit(EVENTS.QUEUE_ADD, { videoId: video.id });
        setSearchResults([]); // Clear results after adding
        setInput("");
    };

    const handleUpvote = (videoId: string) => {
        if (!socket) return;
        socket.emit(EVENTS.QUEUE_UPVOTE, { videoId });
    };

    return (
        <div className="bg-gray-800 rounded-xl border border-gray-700 flex flex-col h-full overflow-hidden relative">

            {/* 1. Search / Add Header */}
            <div className="p-4 border-b border-gray-700 bg-gray-800/50 z-20 relative">
                <h3 className="font-bold text-gray-300 mb-2">🎵 Queue & Search</h3>
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Search song or paste URL..."
                        className="flex-1 bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:border-purple-500 outline-none"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    />
                    <button
                        onClick={handleSubmit}
                        className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-2 rounded text-sm font-bold transition"
                    >
                        +
                    </button>
                </div>

                {/* Search Results Dropdown */}
                {(searchResults.length > 0 || isSearching) && input && !input.includes("http") && (
                    <div className="absolute top-full left-0 right-0 bg-gray-900 border border-gray-700 shadow-xl rounded-b-xl max-h-80 overflow-y-auto z-50">
                        {isSearching && <div className="p-4 text-center text-gray-500 text-sm">Searching...</div>}

                        {searchResults.map((result) => (
                            <div
                                key={result.id}
                                className="flex items-center gap-3 p-3 hover:bg-gray-800 cursor-pointer border-b border-gray-800 last:border-0 transition"
                                onClick={() => handleAddResult(result)}
                            >
                                <img src={result.thumbnail} alt="thumb" className="w-12 h-9 object-cover rounded" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-gray-200 truncate">{result.title}</p>
                                    <p className="text-xs text-gray-500 truncate">{result.channelTitle}</p>
                                </div>
                                <span className="text-purple-400 text-xs font-bold">+ ADD</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 3. The Queue List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2 z-10">
                {room.queue.length === 0 ? (
                    <div className="text-center text-gray-500 py-8 text-sm">
                        The queue is empty.<br />Search or paste a link to start!
                    </div>
                ) : (
                    room.queue.map((video, index) => (
                        <div key={`${video.id}-${index}`} className="flex items-center gap-3 p-2 bg-gray-700/30 rounded hover:bg-gray-700/50 transition group">
                            {/* Thumbnail */}
                            <img
                                src={video.thumbnail}
                                alt="thumb"
                                className="w-12 h-9 object-cover rounded bg-black"
                            />

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-200 truncate">{video.title}</p>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <span>Added by {video.addedBy}</span>
                                    {video.votes > 0 && (
                                        <span className="text-purple-400 font-bold">🔥 {video.votes}</span>
                                    )}
                                </div>
                            </div>

                            {/* Upvote Button */}
                            <button
                                onClick={() => handleUpvote(video.id)}
                                className={`p-2 rounded hover:bg-gray-600 transition ${video.voters.includes(socket?.id || "")
                                    ? "text-purple-400 opacity-50 cursor-default"
                                    : "text-gray-400 hover:text-purple-400"
                                    }`}
                                title="Upvote to bump this song up!"
                                disabled={video.voters.includes(socket?.id || "")}
                            >
                                ▲
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

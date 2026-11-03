"use client";

import { useEffect, useState } from "react";
import { EVENTS, PublicRoom } from "@tuneverse/shared";
import { Socket } from "socket.io-client";
import { useSpotify } from "../context/SpotifyContext";
import Spinner from "./Spinner";
import { MusicResult, SOURCE_NAMES, addToQueue } from "./room/music";

const MOODS = ["Chill", "Party", "Focus", "Energetic", "Late night"];

interface QueueSystemProps {
    room: PublicRoom;
    socket: Socket | null;
}

export default function QueueSystem({ room, socket }: QueueSystemProps) {
    const { spotifyToken } = useSpotify();
    const [suggestions, setSuggestions] = useState<MusicResult[]>([]);
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [showMoods, setShowMoods] = useState(false);
    const [customMood, setCustomMood] = useState("");

    const username = room.users.find((u) => u.id === socket?.id)?.username;
    const isHost = room.hostId === socket?.id;

    useEffect(() => {
        if (!socket) return;

        const handleSuggestions = (data: MusicResult[]) => {
            setSuggestions(data);
            setIsSuggesting(false);
        };
        socket.on(EVENTS.RECOMMENDATIONS_RESULTS, handleSuggestions);
        return () => {
            socket.off(EVENTS.RECOMMENDATIONS_RESULTS, handleSuggestions);
        };
    }, [socket]);

    const askForSuggestions = (mood: string) => {
        if (!socket || isSuggesting) return;
        setIsSuggesting(true);
        setShowMoods(false);
        setSuggestions([]);
        socket.emit(EVENTS.RECOMMENDATIONS_REQUEST, { spotifyToken, mood });
    };

    return (
        <div className="flex h-full flex-col">
            <div className="flex-1 overflow-y-auto">
                {room.queue.length === 0 ? (
                    <p className="p-8 text-center font-serif text-lg italic text-muted-foreground">
                        Queue&apos;s empty. Add a song and it&apos;ll show up here.
                    </p>
                ) : (
                    <ol>
                        {room.queue.map((track, index) => {
                            const hasVoted = !!socket && track.voters?.includes(socket.id ?? "");
                            return (
                                <li key={`${track.id}-${index}`} className="queue-row group flex items-center gap-3 border-b border-border px-4 py-3">
                                    <span className="w-5 shrink-0 font-serif text-lg italic text-muted-foreground">{index + 1}</span>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-[15px]">{track.title}</p>
                                        <p className="truncate text-xs text-muted-foreground">
                                            {SOURCE_NAMES[track.source ?? "youtube"]} · added by {track.addedBy}
                                        </p>
                                    </div>
                                    {(isHost || track.addedBy === username) && (
                                        <button
                                            onClick={() => socket?.emit(EVENTS.QUEUE_REMOVE, { index })}
                                            className="shrink-0 text-xs text-muted-foreground underline underline-offset-2 transition-[opacity,color] hover:text-signal md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100"
                                        >
                                            Remove
                                        </button>
                                    )}
                                    <button
                                        onClick={() => socket?.emit(EVENTS.QUEUE_UPVOTE, { videoId: track.id })}
                                        aria-label={`Vote for ${track.title}, ${track.votes} votes so far`}
                                        aria-pressed={hasVoted}
                                        className={`flex shrink-0 flex-col items-center text-xs leading-none transition-colors ${hasVoted ? "text-signal" : "text-muted-foreground hover:text-foreground"}`}
                                    >
                                        <svg viewBox="0 0 12 8" className="mb-1 h-2 w-3" fill="currentColor" aria-hidden="true"><path d="M6 0l6 8H0z" /></svg>
                                        {track.votes || 0}
                                    </button>
                                </li>
                            );
                        })}
                    </ol>
                )}

                {suggestions.length > 0 && (
                    <div className="dropdown-enter border-b border-border bg-muted p-4">
                        <div className="flex items-baseline justify-between">
                            <h3 className="font-serif text-lg italic">You might like</h3>
                            <button onClick={() => setSuggestions([])} className="text-xs underline underline-offset-2">Close</button>
                        </div>
                        <ul className="mt-2">
                            {suggestions.map((item) => (
                                <li key={item.id}>
                                    <button
                                        onClick={() => {
                                            if (socket) addToQueue(socket, item, item.source ?? "youtube");
                                            setSuggestions((prev) => prev.filter((s) => s.id !== item.id));
                                        }}
                                        className="group flex w-full items-center gap-3 py-2 text-left"
                                    >
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm group-hover:underline">{item.title}</span>
                                            <span className="block truncate text-xs text-muted-foreground">{item.artist}</span>
                                        </span>
                                        <span className="shrink-0 text-xs text-signal">Add</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            <div className="relative border-t border-border p-4">
                {showMoods && (
                    <div className="dropdown-enter absolute inset-x-4 bottom-full z-30 mb-2 border border-border bg-background p-3 shadow-2xl">
                        <div className="flex flex-wrap gap-2">
                            {MOODS.map((mood) => (
                                <button
                                    key={mood}
                                    onClick={() => askForSuggestions(mood)}
                                    className="border border-border px-3 py-1.5 text-sm transition-colors hover:border-foreground hover:bg-foreground hover:text-background"
                                >
                                    {mood}
                                </button>
                            ))}
                        </div>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                if (customMood.trim()) askForSuggestions(customMood.trim());
                            }}
                        >
                            <input
                                value={customMood}
                                maxLength={100}
                                onChange={(e) => setCustomMood(e.target.value)}
                                placeholder="Or describe a mood, then press enter"
                                aria-label="Describe a mood"
                                className="mt-3 w-full border-b border-border bg-transparent py-1.5 text-sm outline-none focus:border-signal placeholder:text-muted-foreground"
                            />
                        </form>
                    </div>
                )}
                <button
                    onClick={() => setShowMoods((open) => !open)}
                    disabled={isSuggesting}
                    aria-expanded={showMoods}
                    className="inline-flex items-center gap-2 text-sm underline underline-offset-4 transition-colors enabled:hover:text-signal disabled:no-underline"
                >
                    {isSuggesting && <Spinner />}
                    {isSuggesting ? "Finding songs for you" : "Suggest songs"}
                </button>
            </div>
        </div>
    );
}

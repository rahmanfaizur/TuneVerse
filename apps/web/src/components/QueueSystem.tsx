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
                    <p className="p-8 text-center text-soft">
                        Queue&apos;s empty. Add a song and it&apos;ll show up here.
                    </p>
                ) : (
                    <ol>
                        {room.queue.map((track, index) => {
                            const hasVoted = !!socket && track.voters?.includes(socket.id ?? "");
                            return (
                                <li key={`${track.id}-${index}`} className="queue-row group flex items-center gap-3 border-b-2 border-wash px-4 py-3">
                                    <span className="display w-6 shrink-0 text-2xl leading-none text-blue">{index + 1}</span>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-[15px]">{track.title}</p>
                                        <p className="truncate text-xs text-soft">
                                            {SOURCE_NAMES[track.source ?? "youtube"]} · added by {track.addedBy}
                                        </p>
                                    </div>
                                    {(isHost || track.addedBy === username) && (
                                        <button
                                            onClick={() => socket?.emit(EVENTS.QUEUE_REMOVE, { index })}
                                            className="ink-link shrink-0 text-xs font-semibold transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100"
                                        >
                                            Remove
                                        </button>
                                    )}
                                    <button
                                        onClick={() => socket?.emit(EVENTS.QUEUE_UPVOTE, { videoId: track.id })}
                                        aria-label={hasVoted ? `Take back your vote for ${track.title}, ${track.votes} votes so far` : `Vote for ${track.title}, ${track.votes} votes so far`}
                                        title={hasVoted ? "Tap again to take your vote back" : undefined}
                                        aria-pressed={hasVoted}
                                        className={`flex w-8 shrink-0 flex-col items-center py-1 text-xs font-bold leading-none transition-colors ${hasVoted ? "bg-pink text-on-pink" : "text-soft hover:bg-wash hover:text-on-pink"}`}
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
                    <div className="dropdown-enter border-b-2 border-rule bg-wash p-4">
                        <div className="flex items-baseline justify-between">
                            <h3 className="display text-2xl text-blue">You might like</h3>
                            <button onClick={() => setSuggestions([])} className="ink-link text-xs font-semibold">Close</button>
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
                                            <span className="block truncate text-xs text-soft">{item.artist}</span>
                                        </span>
                                        <span className="label shrink-0 bg-pink px-2 py-1 text-on-pink">Add</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            <div className="relative border-t-2 border-rule p-4">
                {showMoods && (
                    <div className="dropdown-enter absolute inset-x-4 bottom-full z-30 mb-2 border-2 border-rule bg-paper p-3">
                        <div className="flex flex-wrap gap-2">
                            {MOODS.map((mood) => (
                                <button
                                    key={mood}
                                    onClick={() => askForSuggestions(mood)}
                                    className="border-2 border-ink px-3 py-1 text-sm font-semibold transition-colors hover:bg-ink hover:text-paper"
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
                                className="field mt-3 !py-2 text-sm"
                            />
                        </form>
                    </div>
                )}
                <button
                    onClick={() => setShowMoods((open) => !open)}
                    disabled={isSuggesting}
                    aria-expanded={showMoods}
                    className="ink-link inline-flex items-center gap-2 text-sm font-bold"
                >
                    {isSuggesting && <Spinner />}
                    {isSuggesting ? "Finding songs for you" : "Suggest songs"}
                </button>
            </div>
        </div>
    );
}

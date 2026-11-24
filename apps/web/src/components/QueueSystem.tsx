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
    const [customMood, setCustomMood] = useState("");
    const [askedMood, setAskedMood] = useState("");
    // Folded away, the queue gets the room. Remembered per device.
    const [vibeOpen, setVibeOpen] = useState(true);
    useEffect(() => {
        try {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            if (localStorage.getItem("tuneverse-vibe-open") === "0") setVibeOpen(false);
        } catch {}
    }, []);
    const toggleVibe = () => {
        const next = !vibeOpen;
        setVibeOpen(next);
        try { localStorage.setItem("tuneverse-vibe-open", next ? "1" : "0"); } catch {}
    };

    const username = room.users.find((u) => u.id === socket?.id)?.username;
    // The host and DJs can tidy the queue, not just their own picks.
    const canManage = !!socket?.id && (room.hostId === socket.id || room.djIds.includes(socket.id));

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
        setAskedMood(mood);
        setSuggestions([]);
        socket.emit(EVENTS.RECOMMENDATIONS_REQUEST, { spotifyToken, mood });
    };

    return (
        <div className="flex h-full flex-col">
            <div className="flex-1 overflow-y-auto">
                {/* The vibe bubble: pick a mood (or type one) and get songs that fit. */}
                <div className="border-b-2 border-rule bg-wash px-4 py-3">
                    <button
                        type="button"
                        onClick={toggleVibe}
                        aria-expanded={vibeOpen}
                        aria-controls="vibe-picker"
                        className="label flex w-full items-center justify-between text-soft transition-colors hover:text-ink"
                    >
                        What&apos;s the vibe?
                        <svg viewBox="0 0 12 8" className={`h-2 w-3 transition-transform motion-reduce:transition-none ${vibeOpen ? "" : "-rotate-90"}`} fill="currentColor" aria-hidden="true"><path d="M0 0h12L6 8z" /></svg>
                    </button>
                    <div id="vibe-picker" hidden={!vibeOpen}>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {MOODS.map((mood) => (
                            <button
                                key={mood}
                                onClick={() => askForSuggestions(mood)}
                                disabled={isSuggesting}
                                aria-pressed={askedMood === mood && (isSuggesting || suggestions.length > 0)}
                                className="border-2 border-ink px-2.5 py-0.5 text-xs font-semibold transition-colors enabled:hover:bg-ink enabled:hover:text-paper disabled:opacity-50 aria-pressed:bg-ink aria-pressed:text-paper"
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
                        className="mt-2 flex gap-2"
                    >
                        <input
                            value={customMood}
                            maxLength={100}
                            onChange={(e) => setCustomMood(e.target.value)}
                            placeholder="Or say it: rainy drive, 2000s bangers…"
                            aria-label="Describe a mood"
                            className="field min-w-0 flex-1 !py-1.5 text-sm"
                        />
                        <button
                            type="submit"
                            disabled={isSuggesting || !customMood.trim()}
                            className="shrink-0 bg-pink px-3 text-sm font-bold text-on-pink transition-colors enabled:hover:bg-blue enabled:hover:text-paper disabled:opacity-40"
                        >
                            Go
                        </button>
                    </form>
                    </div>
                    {isSuggesting && (
                        <p className="mt-2 flex items-center gap-2 text-sm text-soft" aria-live="polite">
                            <Spinner /> Finding {askedMood.toLowerCase()} songs…
                        </p>
                    )}
                </div>

                {suggestions.length > 0 && (
                    <div className="dropdown-enter border-b-2 border-rule bg-wash px-4 pb-4 pt-1">
                        <div className="flex items-baseline justify-between">
                            <h3 className="display text-2xl text-blue">{askedMood} picks</h3>
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
                                    {(canManage || track.addedBy === username) && (
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
            </div>
        </div>
    );
}

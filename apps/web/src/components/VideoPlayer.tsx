"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import ReactPlayer from "react-player/youtube";
import SpotifyPlayer from "./SpotifyPlayer";
import { PublicRoom, EVENTS } from "@tuneverse/shared";
import { Socket } from "socket.io-client";
import { SyncEngine } from "../lib/sync-engine";
import PlayPicker from "./room/PlayPicker";
import { MusicSource, SOURCE_NAMES } from "./room/music";

const REACTIONS = ["🔥", "❤️", "😂", "😮", "🎉"];
const YT_PLAYING = 1;

interface VideoPlayerProps {
    room: PublicRoom;
    socket: Socket | null;
    onPickSource: (source: MusicSource) => void;
}

export default function VideoPlayer({ room, socket, onPickSource }: VideoPlayerProps) {
    const playerRef = useRef<ReactPlayer>(null);
    const [isReady, setIsReady] = useState(false);
    const isSeekingRef = useRef(false); // Flag to prevent infinite seek loops

    // Initialize SyncEngine once per socket connection
    const syncEngine = useMemo(() => {
        if (!socket) return null;
        return new SyncEngine(socket);
    }, [socket]);

    // 1. Calculate the "Real" Server Time using SyncEngine
    const getServerTime = () => {
        if (!syncEngine) return room.playback.timestamp;
        return syncEngine.getCorrectedTime(
            room.playback.timestamp,
            room.playback.lastUpdated,
            room.playback.status
        );
    };

    // 2. The Sync Logic (Run this often)
    const checkDrift = () => {
        if (!isReady || !playerRef.current || isSeekingRef.current) return;

        const player = playerRef.current;
        const serverTime = getServerTime();
        const playerTime = player.getCurrentTime();
        const drift = serverTime - playerTime;
        const absDrift = Math.abs(drift);

        // ADAPTIVE CORRECTION STRATEGY
        if (absDrift > 3.0) {
            // SEVERE DRIFT (>3s): Hard Seek
                        isSeekingRef.current = true;
            player.seekTo(serverTime, "seconds");
            // Reset playback rate
            const internalPlayer = player.getInternalPlayer();
            if (internalPlayer && internalPlayer.setPlaybackRate) {
                internalPlayer.setPlaybackRate(1);
            }
            setTimeout(() => { isSeekingRef.current = false; }, 1000);
        } else if (absDrift > 0.3) {
            // SMALL/MEDIUM DRIFT (0.3s - 3s): Adjust Playback Rate
            // If we are behind (drift > 0), speed up. If ahead, slow down.
            // We use 1.05x for medium, 1.02x for small.
            const rate = drift > 0 ? 1.05 : 0.95;
            
            const internalPlayer = player.getInternalPlayer();
            if (internalPlayer && internalPlayer.setPlaybackRate) {
                internalPlayer.setPlaybackRate(rate);
            }
        } else {
            // NEGLIGIBLE DRIFT (<0.3s): Normal Speed
            const internalPlayer = player.getInternalPlayer();
            if (internalPlayer && internalPlayer.setPlaybackRate) {
                // Only reset if not already 1 (optimization)
                // Note: getPlaybackRate might not be available on wrapper, so we just set it.
                internalPlayer.setPlaybackRate(1);
            }
        }
    };

    // 3. Handle External Updates (Room Changed)
    useEffect(() => {
        if (!isReady || !playerRef.current) return;

        // If status changed (Play <-> Pause), force an immediate drift check
        checkDrift();
    }, [room.playback, isReady]);

    // Browsers often block sound until someone interacts with the page, which would
    // leave a new listener sitting in silence without knowing why.
    const [isBlockedByBrowser, setIsBlockedByBrowser] = useState(false);

    useEffect(() => {
        setIsBlockedByBrowser(false);
        if (!isReady || room.playbackSource !== "youtube" || room.playback.status !== "PLAYING") return;

        const timer = setTimeout(() => {
            const state = playerRef.current?.getInternalPlayer()?.getPlayerState?.();
            if (state !== undefined && state !== YT_PLAYING) setIsBlockedByBrowser(true);
        }, 2500);
        return () => clearTimeout(timer);
    }, [isReady, room.playback.status, room.playback.videoId, room.playbackSource]);

    const startListening = () => {
        playerRef.current?.getInternalPlayer()?.playVideo?.();
        setIsBlockedByBrowser(false);
    };

    // 4. User Controls
    const handlePlay = () => {
        if (!socket || isSeekingRef.current) return;
        if (room.playback.status !== "PLAYING") {
            socket.emit(EVENTS.PLAYER_PLAY, {
                videoId: room.playback.videoId,
                timestamp: playerRef.current?.getCurrentTime() || 0,
            });
        }
    };

    const handlePause = () => {
        if (!socket || isSeekingRef.current) return;
        if (room.playback.status === "PLAYING") {
            socket.emit(EVENTS.PLAYER_PAUSE, {
                timestamp: playerRef.current?.getCurrentTime() || 0,
            });
        }
    };

    const handleSeek = (seconds: number) => {
        // If we are currently "Auto-Syncing", IGNORE this event.
        // It wasn't the user. It was us.
        if (isSeekingRef.current) return;

        if (socket) {
            socket.emit(EVENTS.PLAYER_SEEK, { timestamp: seconds });
        }
    };

    const handleEnded = () => {
        if (!socket || !room.playback.videoId) return;
        socket.emit(EVENTS.PLAYER_ENDED, { videoId: room.playback.videoId });
    };

    const handleSkip = () => {
        if (!socket) return;
        socket.emit(EVENTS.PLAYER_SKIP);
    };

    const handlePrevious = () => {
        if (!socket) return;
        socket.emit(EVENTS.PLAYER_PREVIOUS);
    };

    // 5. Reactions
    const [reactions, setReactions] = useState<{ id: string; emoji: string; x: number }[]>([]);
    const [showMobileReactions, setShowMobileReactions] = useState(false); // Mobile toggle

    useEffect(() => {
        if (!socket) return;

        const handleReaction = (payload: { emoji: string; userId: string }) => {
            const id = Math.random().toString(36).substring(2, 9);
            // Random X position between 10% and 90%
            const x = Math.floor(Math.random() * 80) + 10;

            setReactions((prev) => [...prev, { id, emoji: payload.emoji, x }]);

            // Remove after animation (2s)
            setTimeout(() => {
                setReactions((prev) => prev.filter((r) => r.id !== id));
            }, 2000);
        };

        socket.on(EVENTS.EMOJI_REACTION, handleReaction);

        return () => {
            socket.off(EVENTS.EMOJI_REACTION, handleReaction);
        };
    }, [socket]);

    const handleReaction = (emoji: string) => {
        if (!socket) return;
        socket.emit(EVENTS.EMOJI_REACTION, { emoji });
    };

    const nowPlaying = room.playback.meta?.title;

    return (
        <div className="relative flex h-full w-full flex-col">
            <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black">
                {!room.playback.videoId ? (
                    <PlayPicker onPick={onPickSource} />
                ) : (
                    <>
                        <div className={room.playbackSource === 'spotify' ? 'w-full h-full' : 'hidden'}>
                            <SpotifyPlayer room={room} socket={socket} getServerTime={getServerTime} />
                        </div>
                        <div className={room.playbackSource === 'youtube' ? 'w-full h-full' : 'hidden'}>
                            <ReactPlayer
                                ref={playerRef}
                                url={`https://www.youtube.com/watch?v=${room.playback.videoId}`}
                                width="100%"
                                height="100%"
                                playing={room.playback.status === "PLAYING" && room.playbackSource === 'youtube'}
                                controls={true}
                                config={{
                                    playerVars: {
                                        origin: typeof window !== "undefined" ? window.location.origin : undefined,
                                        playsinline: 1,
                                    },
                                }}

                                onReady={() => setIsReady(true)}
                                onStart={() => setIsBlockedByBrowser(false)}

                                onProgress={checkDrift}
                                progressInterval={500}

                                onPlay={handlePlay}
                                onPause={handlePause}
                                onSeek={handleSeek}
                                onEnded={handleEnded}
                            />
                        </div>
                        {isBlockedByBrowser && (
                            <button
                                onClick={startListening}
                                className="absolute inset-0 z-10 flex items-center justify-center bg-black/85 font-serif text-3xl italic text-white transition-colors hover:bg-black/75 md:text-5xl"
                            >
                                Press to listen in
                            </button>
                        )}
                    </>
                )}
            </div>

            {/* Reaction Overlay */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {reactions.map((r) => (
                    <div
                        key={r.id}
                        className="absolute text-4xl animate-float-up"
                        style={{ left: `${r.x}%`, bottom: "10%" }}
                    >
                        {r.emoji}
                    </div>
                ))}
            </div>

            {room.playback.videoId && (
                <div className="relative z-10 flex shrink-0 items-center gap-4 bg-background py-3 pl-0.5">
                    {room.hostId === socket?.id ? (
                        <div className="flex shrink-0 items-center gap-3">
                            <button onClick={handlePrevious} aria-label="Restart track" className="p-1 transition-colors hover:text-signal">
                                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true"><path d="M6 5h2v14H6zM20 5v14L9 12z" /></svg>
                            </button>
                            <button
                                onClick={room.playback.status === "PLAYING" ? handlePause : handlePlay}
                                aria-label={room.playback.status === "PLAYING" ? "Pause" : "Play"}
                                className="flex h-10 w-10 items-center justify-center bg-accent text-accent-foreground transition-colors hover:bg-signal hover:text-signal-foreground"
                            >
                                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                                    {room.playback.status === "PLAYING" ? <path d="M6 4h4v16H6zM14 4h4v16h-4z" /> : <path d="M7 4l14 8-14 8z" />}
                                </svg>
                            </button>
                            <button onClick={handleSkip} aria-label="Skip track" className="p-1 transition-colors hover:text-signal">
                                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true"><path d="M16 5h2v14h-2zM4 5v14l11-7z" /></svg>
                            </button>
                        </div>
                    ) : null}

                    <p className="min-w-0 flex-1 truncate text-sm">
                        <span className="font-serif italic text-signal">
                            {room.playback.status === "PAUSED" ? "Paused" : "Now playing"} on {SOURCE_NAMES[room.playbackSource]}
                        </span>
                        {nowPlaying && <span className="ml-2">{nowPlaying}</span>}
                    </p>

                    <div className="relative shrink-0">
                        <div className="hidden gap-1 md:flex">
                            {REACTIONS.map((emoji) => (
                                <button key={emoji} onClick={() => handleReaction(emoji)} aria-label={`React with ${emoji}`} className="p-1 text-lg transition-transform hover:-translate-y-0.5 active:scale-90">
                                    {emoji}
                                </button>
                            ))}
                        </div>
                        <div className="md:hidden">
                            {showMobileReactions && (
                                <div className="dropdown-enter absolute bottom-full right-0 mb-2 flex gap-1 border border-border bg-background p-2 shadow-xl">
                                    {REACTIONS.map((emoji) => (
                                        <button
                                            key={emoji}
                                            onClick={() => {
                                                handleReaction(emoji);
                                                setShowMobileReactions(false);
                                            }}
                                            aria-label={`React with ${emoji}`}
                                            className="p-1 text-2xl"
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            )}
                            <button onClick={() => setShowMobileReactions((open) => !open)} aria-expanded={showMobileReactions} className="text-sm underline underline-offset-4">
                                React
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

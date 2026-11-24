"use client";

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import ReactPlayer from "react-player/youtube";
import SpotifyPlayer from "./SpotifyPlayer";
import { PublicRoom, EVENTS } from "@tuneverse/shared";
import { Socket } from "socket.io-client";
import { SyncEngine } from "../lib/sync-engine";
import PlayPicker from "./room/PlayPicker";
import { MusicSource, SOURCE_NAMES } from "./room/music";
import SeekBar from "./room/SeekBar";

// The reactions people send are emoji on purpose; they are content, not icons. avoid-ai-design-ignore: I2
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

    // The effect below should only run when playback changes, so it calls the latest checkDrift through a ref.
    const checkDriftRef = useRef(checkDrift);
    useEffect(() => {
        checkDriftRef.current = checkDrift;
    });

    // 3. Handle External Updates (Room Changed)
    useEffect(() => {
        if (!isReady || !playerRef.current) return;

        // If status changed (Play <-> Pause), force an immediate drift check
        checkDriftRef.current();
    }, [room.playback, isReady]);

    // Browsers often block sound until someone interacts with the page, which would
    // leave a new listener sitting in silence without knowing why.
    // Remember which moment got blocked, so a new song or a pause clears it without an extra reset.
    const playbackKey = `${room.playback.videoId}|${room.playback.status}|${room.playbackSource}|${isReady}`;
    const [blockedAt, setBlockedAt] = useState<string | null>(null);
    const isBlockedByBrowser = blockedAt === playbackKey;

    useEffect(() => {
        if (!isReady || room.playbackSource !== "youtube" || room.playback.status !== "PLAYING") return;

        const timer = setTimeout(() => {
            const state = playerRef.current?.getInternalPlayer()?.getPlayerState?.();
            if (state !== undefined && state !== YT_PLAYING) setBlockedAt(playbackKey);
        }, 2500);
        return () => clearTimeout(timer);
    }, [isReady, room.playback.status, room.playback.videoId, room.playbackSource, playbackKey]);

    const startListening = () => {
        playerRef.current?.getInternalPlayer()?.playVideo?.();
        setBlockedAt(null);
    };

    // Who drives playback: the host, and anyone the host made a DJ. Everyone else votes to skip.
    const myId = socket?.id;
    const canControl = !!myId && (room.hostId === myId || room.djIds.includes(myId));
    const skipVotes = room.skipVotes ?? [];
    const skipVotesNeeded = Math.floor(room.users.length / 2) + 1;
    const hasVotedSkip = !!myId && skipVotes.includes(myId);

    // Progress as the room hears it, ticking while a song plays.
    const [, setTick] = useState(0);
    useEffect(() => {
        if (room.playback.status !== "PLAYING") return;
        const timer = setInterval(() => setTick((n) => n + 1), 500);
        return () => clearInterval(timer);
    }, [room.playback.status]);

    // Each player reports the song's length; keep it with the song it belongs to.
    const [length, setLength] = useState<{ videoId: string | null; seconds: number }>({ videoId: null, seconds: 0 });
    const playingId = room.playback.videoId;
    const reportDuration = useCallback((seconds: number) => setLength({ videoId: playingId, seconds }), [playingId]);
    const duration = length.videoId === room.playback.videoId ? length.seconds : 0;

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
        if (!socket || !canControl) return;
        socket.emit(EVENTS.PLAYER_SEEK, { timestamp: seconds });
        // Jump here straight away rather than waiting for the room to echo it back.
        if (room.playbackSource === "youtube" && playerRef.current) {
            isSeekingRef.current = true;
            playerRef.current.seekTo(seconds, "seconds");
            setTimeout(() => { isSeekingRef.current = false; }, 1000);
        }
    };

    const voteSkip = () => {
        if (!socket) return;
        socket.emit(EVENTS.SKIP_VOTE); // a second tap takes the vote back
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
        <div className="relative flex w-full flex-col">
            <div className={room.playback.videoId ? "relative aspect-video w-full overflow-hidden bg-black" : "w-full"}>
                {!room.playback.videoId ? (
                    <PlayPicker onPick={onPickSource} />
                ) : (
                    <>
                        <div className={room.playbackSource === 'spotify' ? 'w-full h-full' : 'hidden'}>
                            <SpotifyPlayer room={room} socket={socket} getServerTime={getServerTime} onDuration={reportDuration} />
                        </div>
                        <div className={room.playbackSource === 'youtube' ? 'relative w-full h-full' : 'hidden'}>
                            <ReactPlayer
                                ref={playerRef}
                                url={`https://www.youtube.com/watch?v=${room.playback.videoId}`}
                                width="100%"
                                height="100%"
                                playing={room.playback.status === "PLAYING" && room.playbackSource === 'youtube'}
                                // Our own controls drive the room; YouTube's would only move this one screen.
                                controls={false}
                                config={{
                                    playerVars: {
                                        origin: typeof window !== "undefined" ? window.location.origin : undefined,
                                        playsinline: 1,
                                    },
                                }}

                                onReady={() => setIsReady(true)}
                                onDuration={reportDuration}
                                onStart={() => setBlockedAt(null)}

                                onProgress={checkDrift}
                                progressInterval={500}

                                onEnded={handleEnded}
                            />
                            {/* Clicking the video would pause it for this screen only, out of sync with the room. */}
                            <div aria-hidden className="absolute inset-0" />
                        </div>
                        {isBlockedByBrowser && (
                            <button
                                onClick={startListening}
                                className="display absolute inset-0 z-10 flex items-center justify-center bg-stage/90 text-5xl text-on-stage transition-colors hover:bg-stage/80 md:text-7xl"
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
                <div className="relative z-10 shrink-0 border-t-2 border-rule bg-paper px-4 pb-3 pt-2">
                <SeekBar position={getServerTime()} duration={duration} canSeek={canControl} onSeek={handleSeek} />
                <div className="mt-1 flex items-center gap-4">
                    {canControl ? (
                        <div className="flex shrink-0 items-center gap-3">
                            <button onClick={handlePrevious} aria-label="Restart track" className="p-1 transition-colors hover:text-blue">
                                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true"><path d="M6 5h2v14H6zM20 5v14L9 12z" /></svg>
                            </button>
                            <button
                                onClick={room.playback.status === "PLAYING" ? handlePause : handlePlay}
                                aria-label={room.playback.status === "PLAYING" ? "Pause" : "Play"}
                                className="flex h-11 w-11 items-center justify-center rounded-full bg-pink text-on-pink transition-colors hover:bg-blue hover:text-paper"
                            >
                                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                                    {room.playback.status === "PLAYING" ? <path d="M6 4h4v16H6zM14 4h4v16h-4z" /> : <path d="M7 4l14 8-14 8z" />}
                                </svg>
                            </button>
                            <button onClick={handleSkip} aria-label="Skip track" className="p-1 transition-colors hover:text-blue">
                                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true"><path d="M16 5h2v14h-2zM4 5v14l11-7z" /></svg>
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={voteSkip}
                            aria-pressed={hasVotedSkip}
                            aria-label={hasVotedSkip ? `Take back your skip vote, ${skipVotes.length} of ${skipVotesNeeded} votes` : `Vote to skip, ${skipVotes.length} of ${skipVotesNeeded} votes`}
                            title={hasVotedSkip ? "Tap again to take your vote back" : undefined}
                            className={`flex shrink-0 items-center gap-2 border-2 px-3 py-1.5 text-sm font-bold transition-colors ${hasVotedSkip ? "border-pink bg-pink text-on-pink hover:border-ink" : "border-ink hover:bg-ink hover:text-paper"}`}
                        >
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true"><path d="M16 5h2v14h-2zM4 5v14l11-7z" /></svg>
                            {hasVotedSkip ? "Voted" : "Skip"}
                            <span className="tabular-nums opacity-80">{skipVotes.length}/{skipVotesNeeded}</span>
                        </button>
                    )}

                    <p className="min-w-0 flex-1 truncate text-sm">
                        {nowPlaying && <span className="block truncate font-bold">{nowPlaying}</span>}
                        <span className="block text-soft">
                            {room.playback.status === "PAUSED" ? "Paused" : "Playing"} on {SOURCE_NAMES[room.playbackSource]}
                        </span>
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
                                <div className="dropdown-enter absolute bottom-full right-0 mb-2 flex gap-1 border-2 border-rule bg-paper p-2">
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
                            <button onClick={() => setShowMobileReactions((open) => !open)} aria-expanded={showMobileReactions} className="ink-link text-sm font-semibold">
                                React
                            </button>
                        </div>
                    </div>
                </div>
                </div>
            )}
        </div>
    );
}

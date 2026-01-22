"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import ReactPlayer from "react-player/youtube";
import { Room, EVENTS } from "@tuneverse/shared";
import { Socket } from "socket.io-client";
import { SyncEngine } from "../lib/sync-engine";

interface VideoPlayerProps {
    room: Room;
    socket: Socket | null;
}

export default function VideoPlayer({ room, socket }: VideoPlayerProps) {
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
            console.warn(`⚠️ Severe drift: ${absDrift.toFixed(2)}s - Seeking`);
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
            console.log(`🔧 Drift: ${drift.toFixed(2)}s - Adjusting rate to ${rate}x`);

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
            console.log("👆 User Seeked manually");
            socket.emit(EVENTS.PLAYER_SEEK, { timestamp: seconds });
        }
    };

    const handleEnded = () => {
        if (!socket) return;
        console.log("🏁 Video Ended");
        socket.emit(EVENTS.PLAYER_ENDED);
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

    return (
        <div className="w-full h-full bg-black relative flex flex-col group">
            <div className="flex-1 relative bg-black dark:bg-black flex items-center justify-center overflow-hidden">
                {!room.playback.videoId ? (
                    <div className="text-center space-y-4 p-6 animate-in fade-in duration-700 max-w-sm border border-white/10 bg-white/5 rounded-2xl backdrop-blur-sm">
                        <div className="w-16 h-16 border border-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-xl md:text-2xl font-serif italic text-white tracking-wide">
                                No Media Playing
                            </h3>
                            <p className="text-[10px] font-sans uppercase tracking-[0.2em] text-gray-400">
                                Add a track to start
                            </p>
                        </div>
                    </div>
                ) : (
                    <ReactPlayer
                        ref={playerRef}
                        url={`https://www.youtube.com/watch?v=${room.playback.videoId}`}
                        width="100%"
                        height="100%"
                        playing={room.playback.status === "PLAYING"}
                        controls={true}
                        config={{
                            playerVars: {
                                origin: typeof window !== "undefined" ? window.location.origin : undefined,
                                playsinline: 1,
                            },
                        }}

                        onReady={() => setIsReady(true)}

                        // Check drift every 500ms (more frequent for adaptive)
                        onProgress={checkDrift}
                        progressInterval={500}

                        onPlay={handlePlay}
                        onPause={handlePause}
                        onSeek={handleSeek}
                        onEnded={handleEnded}
                    />
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

            {/* Control Bar */}
            <div className="bg-gray-900 border-t border-gray-700 p-2 md:p-3 flex items-center justify-between relative z-10 h-12 md:h-16">
                {/* Left: Playback Controls */}
                <div className="flex items-center gap-4 md:gap-6">
                    {room.hostId === socket?.id ? (
                        <>
                            <button
                                onClick={handlePrevious}
                                className="text-gray-400 hover:text-white transition hover:scale-110 active:scale-95"
                                title="Previous"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="19 20 9 12 19 4 19 20"></polygon><line x1="5" y1="19" x2="5" y2="5"></line></svg>
                            </button>

                            <button
                                onClick={room.playback.status === "PLAYING" ? handlePause : handlePlay}
                                className="bg-white text-black rounded-full w-10 h-10 md:w-12 md:h-12 flex items-center justify-center hover:scale-105 active:scale-95 transition shadow-lg shadow-white/10"
                            >
                                {room.playback.status === "PLAYING" ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none" className="ml-1"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                                )}
                            </button>

                            <button
                                onClick={handleSkip}
                                className="text-gray-400 hover:text-white transition hover:scale-110 active:scale-95"
                                title="Skip"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19"></line></svg>
                            </button>
                        </>
                    ) : (
                        <div className="flex items-center gap-2 text-gray-500 text-[10px] md:text-xs font-sans uppercase tracking-widest">
                            <span>Synced</span>
                        </div>
                    )}
                </div>

                {/* Center: Reaction Bar (Desktop) */}
                <div className="hidden md:flex absolute left-1/2 transform -translate-x-1/2 gap-2">
                    {["🔥", "❤️", "😂", "😮", "🎉"].map((emoji) => (
                        <button
                            key={emoji}
                            onClick={() => handleReaction(emoji)}
                            className="text-xl hover:scale-125 transition-transform active:scale-90"
                        >
                            {emoji}
                        </button>
                    ))}
                </div>

                {/* Mobile Reaction Button & Menu */}
                <div className="md:hidden relative">
                    {showMobileReactions && (
                        <div className="absolute bottom-full right-0 mb-2 bg-gray-800 border border-gray-700 rounded-lg p-2 flex flex-col gap-2 shadow-xl animate-in fade-in slide-in-from-bottom-2">
                            {["🔥", "❤️", "😂", "😮", "🎉"].map((emoji) => (
                                <button
                                    key={emoji}
                                    onClick={() => {
                                        handleReaction(emoji);
                                        setShowMobileReactions(false);
                                    }}
                                    className="text-2xl hover:scale-125 transition-transform active:scale-90 p-1"
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    )}
                    <button
                        onClick={() => setShowMobileReactions(!showMobileReactions)}
                        className="text-xl p-2 text-gray-400 hover:text-white transition"
                    >
                        😊
                    </button>
                </div>

                {/* Right: Status */}
                <div className="text-[10px] md:text-xs text-gray-500 font-mono hidden sm:block">
                    {room.playback.status}
                </div>
            </div>
        </div>
    );
}

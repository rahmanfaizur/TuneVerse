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

    return (
        <div className="w-full h-full bg-black relative flex flex-col group">
            <div className="flex-1 relative bg-black dark:bg-black flex items-center justify-center overflow-hidden">
                {!room.playback.videoId ? (
                    <div className="text-center space-y-6 p-8 animate-in fade-in duration-700">
                        <div className="w-24 h-24 border border-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-3xl md:text-4xl font-serif italic text-white tracking-wide">
                                No Media Playing
                            </h3>
                            <p className="text-[10px] font-sans uppercase tracking-[0.3em] text-gray-500">
                                Add a track to the queue to start
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

            {/* Control Bar */}
            <div className="bg-gray-900 border-t border-gray-700 p-3 flex items-center justify-between">
                {room.hostId === socket?.id ? (
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handlePrevious}
                            className="text-gray-400 hover:text-white transition"
                            title="Previous"
                        >
                            ⏮️
                        </button>

                        <button
                            onClick={room.playback.status === "PLAYING" ? handlePause : handlePlay}
                            className="bg-white text-black rounded-full w-10 h-10 flex items-center justify-center hover:scale-105 transition font-bold"
                        >
                            {room.playback.status === "PLAYING" ? "⏸" : "▶"}
                        </button>

                        <button
                            onClick={handleSkip}
                            className="text-gray-400 hover:text-white transition"
                            title="Skip"
                        >
                            ⏭️
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-gray-500 text-xs font-sans uppercase tracking-widest">
                        <span>Synced with Host</span>
                    </div>
                )}

                <div className="text-xs text-gray-500 font-mono">
                    {room.playback.status}
                </div>
            </div>
        </div>
    );
}

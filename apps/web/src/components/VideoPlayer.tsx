import { useEffect, useRef, useState } from "react";
import ReactPlayer from "react-player/youtube";
import { Room, EVENTS } from "@tuneverse/shared";
import { Socket } from "socket.io-client";

interface VideoPlayerProps {
    room: Room;
    socket: Socket | null;
}

export default function VideoPlayer({ room, socket }: VideoPlayerProps) {
    const playerRef = useRef<ReactPlayer>(null);
    const [isReady, setIsReady] = useState(false);
    const isSeekingRef = useRef(false); // Flag to prevent infinite seek loops

    // 1. Calculate the "Real" Server Time
    const getServerTime = () => {
        if (room.playback.status === "PAUSED") {
            return room.playback.timestamp;
        }
        const now = Date.now();
        const timeElapsed = (now - room.playback.lastUpdated) / 1000;
        return room.playback.timestamp + timeElapsed;
    };

    // 2. The Sync Logic (Run this often)
    const checkDrift = () => {
        if (!isReady || !playerRef.current || isSeekingRef.current) return;

        const player = playerRef.current;
        const serverTime = getServerTime();
        const playerTime = player.getCurrentTime();

        // DRIFT THRESHOLD: 1.0 second (Tighter than before)
        if (Math.abs(playerTime - serverTime) > 1.0) {
            console.log(`⚡ Auto-Sync: Jumping from ${playerTime.toFixed(1)} to ${serverTime.toFixed(1)}`);
            isSeekingRef.current = true; // Lock events
            player.seekTo(serverTime, "seconds");

            // Unlock after a short delay (allow seek to finish)
            setTimeout(() => {
                isSeekingRef.current = false;
            }, 1000);
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
            <div className="flex-1 relative">
                <ReactPlayer
                    ref={playerRef}
                    url={`https://www.youtube.com/watch?v=${room.playback.videoId || "dQw4w9WgXcQ"}`}
                    width="100%"
                    height="100%"
                    playing={room.playback.status === "PLAYING"}
                    controls={true}

                    onReady={() => setIsReady(true)}

                    // Check drift every 1 second while playing
                    onProgress={checkDrift}
                    progressInterval={1000}

                    onPlay={handlePlay}
                    onPause={handlePause}
                    onSeek={handleSeek}
                    onEnded={handleEnded}
                />
            </div>

            {/* Control Bar */}
            <div className="bg-gray-900 border-t border-gray-700 p-3 flex items-center justify-between">
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

                <div className="text-xs text-gray-500 font-mono">
                    {room.playback.status}
                </div>
            </div>
        </div>
    );
}

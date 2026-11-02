"use client";

import { useEffect, useRef, useState } from "react";
import { useSpotify } from "../context/SpotifyContext";
import { EVENTS, PublicRoom } from "@tuneverse/shared";
import { Socket } from "socket.io-client";

// Spotify has no rate control like the YouTube player, so we can only seek.
// Seeking is audible, hence the wide margin.
const MAX_DRIFT_MS = 3000;

interface SpotifyPlayerProps {
    room: PublicRoom;
    socket: Socket | null;
    getServerTime: () => number;
}

export default function SpotifyPlayer({ room, socket, getServerTime }: SpotifyPlayerProps) {
    const { player, deviceId, isConnected, playTrack } = useSpotify();
    const [currentTrack, setCurrentTrack] = useState<Spotify.Track | null>(null);
    const [isPaused, setPaused] = useState(false);
    const [isActive, setActive] = useState(false);

    const latest = useRef({ room, socket });
    latest.current = { room, socket };

    useEffect(() => {
        if (!player) return;

        const handleStateChange = (state: Spotify.PlaybackState | null) => {
            if (!state) {
                setActive(false);
                return;
            }

            const track = state.track_window.current_track;
            setCurrentTrack(track);
            setPaused(state.paused);
            setActive(true);

            // The SDK has no "ended" event. A finished track shows up as paused at 0
            // with the same track already listed in previous_tracks.
            const finished = state.paused && state.position === 0 &&
                state.track_window.previous_tracks.some(t => t.id === track.id);
            const { room: currentRoom, socket: currentSocket } = latest.current;

            if (finished && currentRoom.playbackSource === 'spotify' && currentRoom.playback.videoId) {
                currentSocket?.emit(EVENTS.PLAYER_ENDED, { videoId: currentRoom.playback.videoId });
            }
        };

        player.addListener('player_state_changed', handleStateChange);
        return () => player.removeListener('player_state_changed', handleStateChange);
    }, [player]);

    // Bring the local player in line with the room
    useEffect(() => {
        if (!player || !deviceId) return;

        if (room.playbackSource !== 'spotify' || !room.playback.videoId) {
            player.getCurrentState().then(state => {
                if (state && !state.paused) player.pause();
            });
            return;
        }

        const targetId = room.playback.videoId;
        const uri = room.playback.meta?.uri || `spotify:track:${targetId}`;
        const isPlaying = room.playback.status === 'PLAYING';
        const targetMs = getServerTime() * 1000;

        player.getCurrentState().then(state => {
            const current = state?.track_window.current_track;
            const onTargetTrack = current && (current.id === targetId || current.linked_from?.id === targetId);

            if (!state || !onTargetTrack) {
                if (isPlaying) playTrack(uri, targetMs);
                return;
            }

            if (state.paused && isPlaying) player.resume();
            if (!state.paused && room.playback.status === 'PAUSED') player.pause();
            if (Math.abs(state.position - targetMs) > MAX_DRIFT_MS) player.seek(targetMs);
        });
        // getServerTime changes every render; room.playback is what should trigger this.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [room.playback, player, deviceId, room.playbackSource, playTrack]);

    const [position, setPosition] = useState(0);
    const [duration, setDuration] = useState(0);

    // Poll for progress
    useEffect(() => {
        if (!player || !isActive || isPaused) return;

        const interval = setInterval(() => {
            player.getCurrentState().then(state => {
                if (state) {
                    setPosition(state.position);
                    setDuration(state.duration);
                }
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [player, isActive, isPaused]);

    // Update duration when track changes
    useEffect(() => {
        if (currentTrack) {
            setDuration(currentTrack.duration_ms);
        }
    }, [currentTrack]);

    if (!isConnected) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-black text-white">
                <p>Please connect Spotify to listen.</p>
            </div>
        );
    }

    // Use room metadata as fallback
    const displayTitle = currentTrack?.name || room.playback.meta?.title || "No Track Playing";
    const displayArtist = currentTrack?.artists[0]?.name || room.playback.meta?.artist || "Unknown Artist";
    const displayImage = currentTrack?.album.images[0]?.url || room.playback.meta?.artwork;

    const formatTime = (ms: number) => {
        const seconds = Math.floor((ms / 1000) % 60);
        const minutes = Math.floor((ms / 1000 / 60));
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <div className="w-full h-full relative bg-black overflow-hidden group">
            {/* Album Art Background (Blurred) */}
            {displayImage && (
                <div
                    className="absolute inset-0 bg-cover bg-center blur-xl opacity-50 scale-110"
                    style={{ backgroundImage: `url(${displayImage})` }}
                />
            )}

            {/* Main Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-8">
                {/* Album Art */}
                <div className="relative w-64 h-64 md:w-96 md:h-96 shadow-2xl mb-8 group-hover:scale-105 transition-transform duration-700">
                    {displayImage ? (
                        <img
                            src={displayImage}
                            alt={displayTitle}
                            className="w-full h-full object-cover shadow-2xl"
                        />
                    ) : (
                        <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                            <span className="text-4xl">🎵</span>
                        </div>
                    )}
                </div>

                {/* Track Info */}
                <div className="text-center space-y-2 mb-8">
                    <h2 className="text-2xl md:text-4xl font-serif font-bold text-white drop-shadow-md">
                        {displayTitle}
                    </h2>
                    <p className="text-lg text-gray-200 font-sans tracking-widest uppercase drop-shadow-md">
                        {displayArtist}
                    </p>
                </div>

                {/* Progress Bar */}
                <div className="w-full max-w-2xl flex items-center gap-4 px-4">
                    <span className="text-xs font-mono text-gray-300 w-10 text-right">{formatTime(position)}</span>
                    <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-white rounded-full transition-all duration-1000 ease-linear"
                            style={{ width: `${duration ? (position / duration) * 100 : 0}%` }}
                        />
                    </div>
                    <span className="text-xs font-mono text-gray-300 w-10">{formatTime(duration)}</span>
                </div>

                {!isActive && (
                    <div className="mt-8 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-widest text-white border border-white/20 animate-pulse">
                        Device Not Active - Transfer Playback
                    </div>
                )}
            </div>

            {/* Visualizer Placeholder (Simulated) */}
            <div className="absolute bottom-0 left-0 right-0 h-32 flex items-end justify-center gap-1 pb-4 z-20 pointer-events-none opacity-50">
                {[...Array(20)].map((_, i) => (
                    <div
                        key={i}
                        className="w-2 bg-white rounded-t-sm animate-pulse"
                        style={{
                            height: `${Math.random() * 100}%`,
                            animationDuration: `${0.5 + Math.random()}s`,
                            animationDelay: `${Math.random() * 0.5}s`
                        }}
                    />
                ))}
            </div>
        </div>
    );
}

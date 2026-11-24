"use client";

import { useEffect, useRef, useState } from "react";
import { useSpotify } from "../context/SpotifyContext";
import { EVENTS, PublicRoom } from "@tuneverse/shared";
import { Socket } from "socket.io-client";
import Button from "./Button";
import Artwork from "./poster/Artwork";

// Spotify has no rate control like the YouTube player, so we can only seek.
// Seeking is audible, hence the wide margin.
const MAX_DRIFT_MS = 3000;

interface SpotifyPlayerProps {
    room: PublicRoom;
    socket: Socket | null;
    getServerTime: () => number;
    onDuration: (seconds: number) => void;
}

export default function SpotifyPlayer({ room, socket, getServerTime, onDuration }: SpotifyPlayerProps) {
    const { player, deviceId, isConnected, playTrack, connectSpotify, isConnecting, needsPremium } = useSpotify();
    const [currentTrack, setCurrentTrack] = useState<Spotify.Track | null>(null);
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

    // The progress bar under the player needs the track length; Spotify knows it once it's playing.
    useEffect(() => {
        if (currentTrack) onDuration(currentTrack.duration_ms / 1000);
    }, [currentTrack, onDuration]);

    if (!isConnected || needsPremium) {
        const artwork = room.playback.meta?.artwork;
        return (
            <div className="flex h-full w-full items-center gap-6 overflow-hidden bg-stage p-6 text-on-stage md:p-10">
                {artwork && <Artwork src={artwork} className="hidden aspect-square h-3/5 shrink-0 sm:block" />}
                <div className="min-w-0 max-w-lg">
                    <p className="label opacity-85">Playing on Spotify</p>
                    <h2 className="display mt-2 text-4xl md:text-5xl">{room.playback.meta?.title ?? "A Spotify track"}</h2>
                    {needsPremium ? (
                        <p className="mt-4 text-[15px] opacity-85">
                            Spotify only lets Premium accounts play music in the browser. You can still chat, or add a YouTube song to the queue.
                        </p>
                    ) : (
                        <>
                            <p className="mt-4 text-[15px] opacity-85">Connect Spotify to hear it. You&apos;ll need Premium and an approved account.</p>
                            <Button onClick={connectSpotify} loading={isConnecting} loadingText="Opening Spotify" className="mt-5">
                                Connect to hear this
                            </Button>
                        </>
                    )}
                </div>
            </div>
        );
    }

    // Use room metadata as fallback
    const displayTitle = currentTrack?.name || room.playback.meta?.title || "No Track Playing";
    const displayArtist = currentTrack?.artists[0]?.name || room.playback.meta?.artist || "Unknown Artist";
    const displayImage = currentTrack?.album.images[0]?.url || room.playback.meta?.artwork;

    return (
        // Laid out in a row so the cover, title and progress all fit inside a 16:9 frame.
        <div className="flex h-full w-full items-center gap-5 overflow-hidden bg-stage p-5 text-on-stage md:gap-8 md:p-10">
            {displayImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={displayImage} alt="" className="aspect-square h-full max-h-80 shrink-0 object-cover" />
            ) : (
                <Artwork className="aspect-square h-full max-h-80 shrink-0" />
            )}

            <div className="min-w-0 flex-1">
                <p className="label opacity-85">Now playing on Spotify</p>
                <h2 className="display mt-2 line-clamp-2 text-3xl md:text-5xl">{displayTitle}</h2>
                <p className="mt-1 truncate text-lg opacity-85">{displayArtist}</p>

                {!isActive && <p className="mt-4 text-[15px] opacity-85">Getting Spotify ready…</p>}
            </div>
        </div>
    );
}

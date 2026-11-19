"use client";

import { useSpotify } from "../../context/SpotifyContext";
import Spinner from "../Spinner";
import { MusicSource } from "./music";

export default function PlayPicker({ onPick }: { onPick: (source: MusicSource) => void }) {
    const { isConnected, spotifyUser, connectSpotify, isConnecting } = useSpotify();

    const pickSpotify = () => {
        if (isConnected) onPick("spotify");
        else connectSpotify();
    };

    const option = "group border-2 border-ink bg-paper p-5 text-left transition-colors hover:bg-ink hover:text-paper md:p-6";

    return (
        <div className="flex w-full flex-col justify-center bg-wash p-6 sm:aspect-video md:p-10">
            <h2 className="display text-5xl text-blue md:text-6xl">What are we playing?</h2>

            <div className="mt-6 grid w-full max-w-2xl gap-3 sm:grid-cols-2 md:gap-4">
                <button onClick={() => onPick("youtube")} className={option}>
                    <span className="display block text-3xl">YouTube</span>
                    <span className="mt-1 block text-[15px] opacity-85">
                        Search any song or paste a link. Works for everyone in the room.
                    </span>
                </button>

                <button onClick={pickSpotify} disabled={isConnecting} aria-busy={isConnecting} className={option}>
                    <span className="display flex items-center gap-3 text-3xl">
                        Spotify
                        {isConnecting && <Spinner className="text-lg" />}
                    </span>
                    <span className="mt-1 block text-[15px] opacity-85">
                        {isConnected
                            ? `Connected as ${spotifyUser?.display_name ?? "you"}. Search your music.`
                            : "Connect your account first. Needs Premium and an approved account."}
                    </span>
                </button>
            </div>
        </div>
    );
}

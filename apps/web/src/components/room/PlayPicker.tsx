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

    return (
        <div className="flex h-full w-full flex-col justify-center overflow-y-auto bg-muted p-5 md:p-10">
            <h2 className="font-serif text-3xl italic md:text-5xl">What do you want to play?</h2>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 md:mt-8 md:gap-4">
                <button
                    onClick={() => onPick("youtube")}
                    className="group bg-background p-4 text-left transition-colors hover:bg-signal hover:text-signal-foreground md:p-6"
                >
                    <span className="block font-serif text-2xl md:text-4xl">YouTube</span>
                    <span className="mt-1 block text-sm opacity-75 md:mt-2 md:text-[15px]">
                        Search any song or paste a link. Works for everyone in the room.
                    </span>
                </button>

                <button
                    onClick={pickSpotify}
                    disabled={isConnecting}
                    aria-busy={isConnecting}
                    className="group bg-background p-4 text-left transition-colors enabled:hover:bg-signal enabled:hover:text-signal-foreground md:p-6"
                >
                    <span className="flex items-center gap-3 font-serif text-2xl md:text-4xl">
                        Spotify
                        {isConnecting && <Spinner className="text-lg" />}
                    </span>
                    <span className="mt-1 block text-sm opacity-75 md:mt-2 md:text-[15px]">
                        {isConnected
                            ? `Connected as ${spotifyUser?.display_name ?? "you"}. Search your music.`
                            : "Connect your account first. Needs Premium and an approved account."}
                    </span>
                </button>
            </div>
        </div>
    );
}

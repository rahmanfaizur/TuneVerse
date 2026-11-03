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
        <div className="flex w-full flex-col justify-center bg-muted p-6 text-center sm:aspect-video md:p-10">
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">What do you want to <em>play?</em></h2>

            <div className="mx-auto mt-6 grid w-full max-w-2xl gap-3 sm:grid-cols-2 md:gap-4">
                <button
                    onClick={() => onPick("youtube")}
                    className="rounded-2xl bg-background p-5 text-left shadow-sm transition-transform hover:-translate-y-0.5 md:p-6"
                >
                    <span className="block text-xl font-semibold tracking-tight md:text-2xl">YouTube</span>
                    <span className="mt-1 block text-[15px] text-muted-foreground">
                        Search any song or paste a link. Works for everyone in the room.
                    </span>
                </button>

                <button
                    onClick={pickSpotify}
                    disabled={isConnecting}
                    aria-busy={isConnecting}
                    className="rounded-2xl bg-background p-5 text-left shadow-sm transition-transform enabled:hover:-translate-y-0.5 md:p-6"
                >
                    <span className="flex items-center gap-3 text-xl font-semibold tracking-tight md:text-2xl">
                        Spotify
                        {isConnecting && <Spinner className="text-lg" />}
                    </span>
                    <span className="mt-1 block text-[15px] text-muted-foreground">
                        {isConnected
                            ? `Connected as ${spotifyUser?.display_name ?? "you"}. Search your music.`
                            : "Connect your account first. Needs Premium and an approved account."}
                    </span>
                </button>
            </div>
        </div>
    );
}

"use client";

import { RefObject, useEffect, useRef, useState } from "react";
import { EVENTS } from "@tuneverse/shared";
import { Socket } from "socket.io-client";
import { useSpotify } from "../../context/SpotifyContext";
import { getApiUrl } from "../../lib/api";
import Button from "../Button";
import Spinner from "../Spinner";
import { MusicResult, MusicSource, SOURCE_NAMES, addToQueue } from "./music";

const SEARCH_DELAY_MS = 350;

interface SpotifySearchTrack {
    id: string;
    title: string;
    artist: string;
    album: string;
    albumArt?: string;
    uri: string;
}

interface MusicSearchProps {
    socket: Socket | null;
    source: MusicSource;
    onSourceChange: (source: MusicSource) => void;
    inputRef: RefObject<HTMLInputElement | null>;
}

export default function MusicSearch({ socket, source, onSourceChange, inputRef }: MusicSearchProps) {
    const { spotifyToken, isConnected, connectSpotify, isConnecting } = useSpotify();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<MusicResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const showSpotifyConnect = source === "spotify" && !isConnected;

    useEffect(() => {
        const closeOnOutsideClick = (e: MouseEvent) => {
            if (!wrapperRef.current?.contains(e.target as Node)) setIsOpen(false);
        };
        document.addEventListener("mousedown", closeOnOutsideClick);
        return () => document.removeEventListener("mousedown", closeOnOutsideClick);
    }, []);

    useEffect(() => {
        if (!socket) return;

        const handleResults = (data: MusicResult[]) => {
            setResults(data);
            setIsSearching(false);
        };
        socket.on(EVENTS.SEARCH_RESULTS, handleResults);
        return () => {
            socket.off(EVENTS.SEARCH_RESULTS, handleResults);
        };
    }, [socket]);

    useEffect(() => {
        const text = query.trim();
        setResults([]);

        if (!text || !socket || showSpotifyConnect) {
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        setIsOpen(true);

        const timer = setTimeout(async () => {
            if (source === "youtube") {
                socket.emit(EVENTS.SEARCH_QUERY, { query: text });
                return;
            }

            try {
                const res = await fetch(`${getApiUrl()}/api/spotify/search?q=${encodeURIComponent(text)}`, {
                    headers: { Authorization: `Bearer ${spotifyToken}` },
                });
                if (!res.ok) throw new Error(`Search failed with ${res.status}`);

                const tracks: SpotifySearchTrack[] = await res.json();
                setResults(tracks.map((track) => ({
                    id: track.id,
                    title: track.title,
                    thumbnail: track.albumArt,
                    channelTitle: track.artist,
                    artist: track.artist,
                    album: track.album,
                    uri: track.uri,
                    source: "spotify",
                })));
            } catch (e) {
                console.error("Spotify search failed", e);
            } finally {
                setIsSearching(false);
            }
        }, SEARCH_DELAY_MS);

        return () => clearTimeout(timer);
    }, [query, source, socket, spotifyToken, showSpotifyConnect]);

    const add = (item: MusicResult) => {
        if (!socket) return;
        addToQueue(socket, item, source);
        setQuery("");
        setIsOpen(false);
        inputRef.current?.focus();
    };

    return (
        <section aria-label="Add music" ref={wrapperRef} className="relative">
            <div className="flex items-baseline gap-6">
                <h2 className="font-serif text-2xl italic md:text-3xl">Add a song</h2>
                <div className="flex gap-5 text-sm" role="group" aria-label="Where to search">
                    {(["youtube", "spotify"] as const).map((option) => (
                        <button
                            key={option}
                            onClick={() => onSourceChange(option)}
                            aria-pressed={source === option}
                            className={`border-b-2 pb-0.5 transition-colors ${source === option ? "border-signal text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                        >
                            {SOURCE_NAMES[option]}
                        </button>
                    ))}
                </div>
            </div>

            {showSpotifyConnect ? (
                <div className="mt-4 flex flex-col items-start justify-between gap-4 border border-border p-5 sm:flex-row sm:items-center">
                    <p className="max-w-md text-[15px] leading-snug text-muted-foreground">
                        Connect Spotify to search it here. You&apos;ll need Premium and an approved account. YouTube works for everyone.
                    </p>
                    <Button onClick={connectSpotify} loading={isConnecting} loadingText="Opening Spotify" className="shrink-0">
                        Connect Spotify
                    </Button>
                </div>
            ) : (
                <div className="relative mt-3">
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onFocus={() => query.trim() && setIsOpen(true)}
                        placeholder={source === "youtube" ? "Search YouTube, or paste a video or playlist link" : "Search Spotify"}
                        aria-label={`Search ${SOURCE_NAMES[source]}`}
                        className="w-full border-b border-foreground bg-transparent py-3 pr-8 text-lg outline-none transition-colors placeholder:text-muted-foreground focus:border-signal"
                    />
                    {isSearching && <Spinner className="absolute right-1 top-4 text-lg text-signal" />}

                    {isOpen && query.trim() && (
                        <div className="dropdown-enter absolute inset-x-0 top-full z-40 max-h-96 overflow-y-auto border border-t-0 border-border bg-background shadow-2xl">
                            {results.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => add(item)}
                                    className="group flex w-full items-center gap-4 border-b border-border p-3 text-left transition-colors last:border-0 hover:bg-muted"
                                >
                                    {item.thumbnail ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={item.thumbnail} alt="" className="h-11 w-[4.5rem] shrink-0 object-cover" />
                                    ) : (
                                        <span className="h-11 w-[4.5rem] shrink-0 bg-muted" />
                                    )}
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-[15px]">{item.title}</span>
                                        <span className="block truncate text-sm text-muted-foreground">{item.channelTitle}</span>
                                    </span>
                                    <span className="shrink-0 text-sm text-signal opacity-0 transition-opacity group-hover:opacity-100 group-focus:opacity-100">Add</span>
                                </button>
                            ))}
                            {!isSearching && results.length === 0 && (
                                <p className="p-4 text-[15px] text-muted-foreground">Nothing found for that. Try other words.</p>
                            )}
                            {isSearching && results.length === 0 && (
                                <p className="p-4 text-[15px] text-muted-foreground">Searching {SOURCE_NAMES[source]}...</p>
                            )}
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}

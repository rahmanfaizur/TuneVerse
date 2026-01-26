"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SpotifyWebApi from "spotify-web-api-js";

// Initialize the Spotify Web API wrapper
const spotifyApi = new SpotifyWebApi();

interface SpotifyUser {
    id: string;
    display_name: string;
    email?: string;
    product: string;
    images?: { url: string }[];
}

interface SpotifyContextType {
    spotifyToken: string | null;
    spotifyUser: SpotifyUser | null;
    isConnected: boolean;
    connectSpotify: () => void;
    disconnectSpotify: () => void;
    sdkReady: boolean;
    player: Spotify.Player | null;
    deviceId: string | null;
    playTrack: (uri: string, positionMs?: number) => Promise<void>;
}

const SpotifyContext = createContext<SpotifyContextType | undefined>(undefined);

export function SpotifyProvider({ children }: { children: ReactNode }) {
    // ... existing state ...
    const [spotifyToken, setSpotifyToken] = useState<string | null>(null);
    const [spotifyUser, setSpotifyUser] = useState<SpotifyUser | null>(null);
    const [sdkReady, setSdkReady] = useState(false);
    const [player, setPlayer] = useState<Spotify.Player | null>(null);
    const [deviceId, setDeviceId] = useState<string | null>(null);
    const router = useRouter();
    const searchParams = useSearchParams();

    // ... existing useEffects ...

    const playTrack = useCallback(async (uri: string, positionMs: number = 0) => {
        if (!spotifyToken || !deviceId) return;

        try {
            await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
                method: 'PUT',
                body: JSON.stringify({ uris: [uri], position_ms: positionMs }),
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${spotifyToken}`
                },
            });
        } catch (e) {
            console.error("Failed to play track", e);
        }
    }, [spotifyToken, deviceId]);

    // ... existing connect/disconnect ...


    useEffect(() => {
        // Check URL params first
        const accessToken = searchParams.get("access_token");
        const refreshToken = searchParams.get("refresh_token");
        const expiresAt = searchParams.get("expires_at");
        const userParam = searchParams.get("user");

        if (accessToken && refreshToken && expiresAt && userParam) {
            // Save to localStorage
            localStorage.setItem("spotify_access_token", accessToken);
            localStorage.setItem("spotify_refresh_token", refreshToken);
            localStorage.setItem("spotify_expires_at", expiresAt);
            localStorage.setItem("spotify_user", userParam);

            setSpotifyToken(accessToken);
            try {
                setSpotifyUser(JSON.parse(userParam));
            } catch (e) {
                console.error("Failed to parse Spotify user", e);
            }

            // Clean URL
            router.replace("/lobby");
        } else {
            // Check localStorage
            const storedToken = localStorage.getItem("spotify_access_token");
            const storedUser = localStorage.getItem("spotify_user");

            if (storedToken) {
                setSpotifyToken(storedToken);
                if (storedUser) {
                    try {
                        setSpotifyUser(JSON.parse(storedUser));
                    } catch (e) {
                        console.error("Failed to parse stored Spotify user", e);
                    }
                }
            }
        }
    }, [searchParams, router]);

    // 2. Initialize Web Playback SDK
    useEffect(() => {
        if (!spotifyToken) return;

        // Load the script
        const script = document.createElement("script");
        script.src = "https://sdk.scdn.co/spotify-player.js";
        script.async = true;
        document.body.appendChild(script);

        window.onSpotifyWebPlaybackSDKReady = () => {
            const player = new window.Spotify.Player({
                name: 'TuneVerse Web Player',
                getOAuthToken: cb => { cb(spotifyToken); },
                volume: 0.5
            });

            player.addListener('ready', ({ device_id }) => {
                console.log('Ready with Device ID', device_id);
                setDeviceId(device_id);
                setSdkReady(true);
            });

            player.addListener('not_ready', ({ device_id }) => {
                console.log('Device ID has gone offline', device_id);
                setSdkReady(false);
            });

            player.addListener('initialization_error', ({ message }) => {
                console.error(message);
            });

            player.addListener('authentication_error', ({ message }) => {
                console.error(message);
            });

            player.addListener('account_error', ({ message }) => {
                console.error(message);
            });

            player.connect();
            setPlayer(player);
        };

        return () => {
            // Cleanup if needed
            if (player) {
                player.disconnect();
            }
        };
    }, [spotifyToken]);

    const connectSpotify = useCallback(() => {
        // Redirect to backend auth route
        // We need to get the URL from the backend first or just hardcode/env it
        // Since we have a route for it: GET /api/spotify/auth
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000'}/api/spotify/auth`)
            .then(res => res.json())
            .then(data => {
                if (data.authUrl) {
                    window.location.href = data.authUrl;
                }
            })
            .catch(err => console.error("Failed to get auth URL", err));
    }, []);

    const disconnectSpotify = useCallback(() => {
        localStorage.removeItem("spotify_access_token");
        localStorage.removeItem("spotify_refresh_token");
        localStorage.removeItem("spotify_expires_at");
        localStorage.removeItem("spotify_user");
        setSpotifyToken(null);
        setSpotifyUser(null);
        setPlayer(null);
        setSdkReady(false);
        setDeviceId(null);
    }, []);

    return (
        <SpotifyContext.Provider value={{
            spotifyToken,
            spotifyUser,
            isConnected: !!spotifyToken,
            connectSpotify,
            disconnectSpotify,
            sdkReady,
            player,
            deviceId,
            playTrack
        }}>
            {children}
        </SpotifyContext.Provider>
    );
}

export function useSpotify() {
    const context = useContext(SpotifyContext);
    if (context === undefined) {
        throw new Error("useSpotify must be used within a SpotifyProvider");
    }
    return context;
}

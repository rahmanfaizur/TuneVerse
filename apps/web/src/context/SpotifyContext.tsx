"use client";

import { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from "react";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000";

const STORAGE = {
    accessToken: "spotify_access_token",
    refreshToken: "spotify_refresh_token",
    expiresAt: "spotify_expires_at",
    user: "spotify_user",
};
const OAUTH_STATE_KEY = "spotify_oauth_state";

// Refresh a bit early so a track starting right at expiry doesn't fail.
const REFRESH_MARGIN_MS = 60 * 1000;

interface SpotifyUser {
    id: string;
    display_name: string;
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

const randomHex = (bytes: number) =>
    Array.from(crypto.getRandomValues(new Uint8Array(bytes)))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

export function SpotifyProvider({ children }: { children: ReactNode }) {
    const [spotifyToken, setSpotifyToken] = useState<string | null>(null);
    const [spotifyUser, setSpotifyUser] = useState<SpotifyUser | null>(null);
    const [sdkReady, setSdkReady] = useState(false);
    const [player, setPlayer] = useState<Spotify.Player | null>(null);
    const [deviceId, setDeviceId] = useState<string | null>(null);
    const [expiresAt, setExpiresAt] = useState<number | null>(null);

    // The SDK holds on to getOAuthToken for its whole life, so it reads from a ref.
    const tokenRef = useRef<string | null>(null);
    const isConnected = !!spotifyToken;

    const saveTokens = useCallback((accessToken: string, tokenExpiresAt: number, refreshToken?: string) => {
        localStorage.setItem(STORAGE.accessToken, accessToken);
        localStorage.setItem(STORAGE.expiresAt, String(tokenExpiresAt));
        if (refreshToken) localStorage.setItem(STORAGE.refreshToken, refreshToken);

        tokenRef.current = accessToken;
        setSpotifyToken(accessToken);
        setExpiresAt(tokenExpiresAt);
    }, []);

    const disconnectSpotify = useCallback(() => {
        Object.values(STORAGE).forEach((key) => localStorage.removeItem(key));
        tokenRef.current = null;
        setSpotifyToken(null);
        setSpotifyUser(null);
        setExpiresAt(null);
    }, []);

    const refreshAccessToken = useCallback(async (): Promise<string | null> => {
        const refreshToken = localStorage.getItem(STORAGE.refreshToken);
        if (!refreshToken) {
            disconnectSpotify();
            return null;
        }

        try {
            const res = await fetch(`${API_URL}/api/spotify/refresh`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ refresh_token: refreshToken }),
            });

            if (res.status === 401) {
                toast.error("Your Spotify login expired. Connect again to keep listening.");
                disconnectSpotify();
                return null;
            }
            if (!res.ok) return tokenRef.current;

            const data = await res.json();
            saveTokens(data.access_token, data.expires_at, data.refresh_token);
            return data.access_token;
        } catch (e) {
            // Probably just offline, so keep the session and let the next attempt retry.
            console.error("Spotify token refresh failed", e);
            return tokenRef.current;
        }
    }, [disconnectSpotify, saveTokens]);

    // Finish a login if we've just come back from Spotify, otherwise restore the saved one.
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const loginId = params.get("spotify_login");
        const returnedState = params.get("state");
        const loginError = params.get("spotify_error");

        if (loginId || loginError) {
            window.history.replaceState(null, "", window.location.pathname);
        }

        if (loginError) {
            toast.error(
                loginError === "denied"
                    ? "Spotify connection cancelled."
                    : "Couldn't connect Spotify. TuneVerse can only connect approved accounts for now."
            );
        }

        if (loginId) {
            const expectedState = sessionStorage.getItem(OAUTH_STATE_KEY);
            sessionStorage.removeItem(OAUTH_STATE_KEY);

            if (!expectedState || expectedState !== returnedState) {
                toast.error("Couldn't verify the Spotify login. Please try again.");
                return;
            }

            fetch(`${API_URL}/api/spotify/session`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: loginId }),
            })
                .then((res) => {
                    if (!res.ok) throw new Error(`Session request failed with ${res.status}`);
                    return res.json();
                })
                .then((data) => {
                    saveTokens(data.access_token, data.expires_at, data.refresh_token);
                    localStorage.setItem(STORAGE.user, JSON.stringify(data.user));
                    setSpotifyUser(data.user);
                })
                .catch((e) => {
                    console.error("Spotify login failed", e);
                    toast.error("Couldn't finish connecting Spotify. Please try again.");
                });
            return;
        }

        const storedToken = localStorage.getItem(STORAGE.accessToken);
        if (!storedToken) return;

        tokenRef.current = storedToken;
        setSpotifyToken(storedToken);
        setExpiresAt(Number(localStorage.getItem(STORAGE.expiresAt)) || 0);

        const storedUser = localStorage.getItem(STORAGE.user);
        if (storedUser) {
            try {
                setSpotifyUser(JSON.parse(storedUser));
            } catch {
                localStorage.removeItem(STORAGE.user);
            }
        }
    }, [saveTokens]);

    // Keep the token fresh for as long as the tab is open.
    useEffect(() => {
        if (expiresAt === null) return;

        const delay = Math.max(expiresAt - Date.now() - REFRESH_MARGIN_MS, 0);
        const timer = setTimeout(refreshAccessToken, delay);
        return () => clearTimeout(timer);
    }, [expiresAt, refreshAccessToken]);

    // Depends on isConnected and not the token, otherwise every refresh rebuilds the player.
    useEffect(() => {
        if (!isConnected) return;

        let instance: Spotify.Player | null = null;
        let cancelled = false;

        const startPlayer = () => {
            if (cancelled) return;

            instance = new window.Spotify.Player({
                name: "TuneVerse Web Player",
                getOAuthToken: (cb) => {
                    const expires = Number(localStorage.getItem(STORAGE.expiresAt)) || 0;
                    if (Date.now() < expires - REFRESH_MARGIN_MS && tokenRef.current) {
                        cb(tokenRef.current);
                        return;
                    }
                    refreshAccessToken().then((token) => {
                        if (token) cb(token);
                    });
                },
                volume: 0.5,
            });

            instance.addListener("ready", ({ device_id }) => {
                setDeviceId(device_id);
                setSdkReady(true);
            });
            instance.addListener("not_ready", () => setSdkReady(false));
            instance.addListener("initialization_error", ({ message }) => {
                console.error("Spotify player failed to start:", message);
                toast.error("Spotify playback isn't supported in this browser.");
            });
            instance.addListener("authentication_error", ({ message }) => {
                console.error("Spotify auth error:", message);
                toast.error("Spotify rejected this login. Try reconnecting.");
            });
            instance.addListener("account_error", () => {
                toast.error("Playing music through Spotify needs a Premium account.");
            });

            instance.connect();
            setPlayer(instance);
        };

        if (window.Spotify) {
            startPlayer();
        } else {
            window.onSpotifyWebPlaybackSDKReady = startPlayer;
            if (!document.querySelector('script[src="https://sdk.scdn.co/spotify-player.js"]')) {
                const script = document.createElement("script");
                script.src = "https://sdk.scdn.co/spotify-player.js";
                script.async = true;
                document.body.appendChild(script);
            }
        }

        return () => {
            cancelled = true;
            instance?.disconnect();
            setPlayer(null);
            setDeviceId(null);
            setSdkReady(false);
        };
    }, [isConnected, refreshAccessToken]);

    const playTrack = useCallback(async (uri: string, positionMs: number = 0) => {
        if (!tokenRef.current || !deviceId) return;

        try {
            const res = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
                method: "PUT",
                body: JSON.stringify({ uris: [uri], position_ms: Math.round(positionMs) }),
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${tokenRef.current}`,
                },
            });
            if (res.status === 403) {
                toast.error("Playing music through Spotify needs a Premium account.");
            }
        } catch (e) {
            console.error("Failed to play track", e);
        }
    }, [deviceId]);

    const connectSpotify = useCallback(() => {
        const state = randomHex(16);
        sessionStorage.setItem(OAUTH_STATE_KEY, state);

        fetch(`${API_URL}/api/spotify/auth?state=${state}`)
            .then((res) => res.json())
            .then((data) => {
                if (data.authUrl) window.location.href = data.authUrl;
            })
            .catch((err) => {
                console.error("Failed to get Spotify auth URL", err);
                toast.error("Couldn't reach Spotify. Please try again.");
            });
    }, []);

    return (
        <SpotifyContext.Provider value={{
            spotifyToken,
            spotifyUser,
            isConnected,
            connectSpotify,
            disconnectSpotify,
            sdkReady,
            player,
            deviceId,
            playTrack,
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

export interface SpotifyAuthTokens {
    access_token: string;
    refresh_token: string;
    expires_at: number;
}

export interface SpotifyUser {
    id: string;
    display_name: string;
    email?: string;
    product: string; // "premium" | "free"
    images?: { url: string }[];
}

export interface SpotifyTrack {
    id: string;
    title: string;
    artist: string;
    album: string;
    albumArt?: string;
    duration: number;
    uri: string; // spotify:track:...
}

export type PlaybackSource = 'youtube' | 'spotify';

export interface SpotifySearchPayload {
    query: string;
    type?: 'track' | 'album' | 'artist';
}

import SpotifyWebApi from 'spotify-web-api-node';

const SCOPES = [
    'user-read-private',
    'user-read-playback-state',
    'user-modify-playback-state',
    'streaming',
];

// Spotify caps search at 10 results per request for apps in development mode.
const MAX_SEARCH_LIMIT = 10;

const appClient = () => new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    redirectUri: process.env.SPOTIFY_REDIRECT_URI || 'http://127.0.0.1:4000/api/spotify/callback',
});

// One client per call. The library keeps the token on the instance, so sharing one
// lets a request from one user go out with another user's token.
const userClient = (accessToken: string) => {
    const client = appClient();
    client.setAccessToken(accessToken);
    return client;
};

const toTrack = (track: SpotifyApi.TrackObjectFull) => ({
    id: track.id,
    title: track.name,
    artist: track.artists.map(a => a.name).join(', '),
    album: track.album.name,
    albumArt: track.album.images[0]?.url,
    duration: track.duration_ms,
    uri: track.uri,
});

export const SpotifyService = {
    getAuthUrl(state: string): string {
        return appClient().createAuthorizeURL(SCOPES, state);
    },

    async exchangeCode(code: string) {
        const { body } = await appClient().authorizationCodeGrant(code);
        return {
            access_token: body.access_token,
            refresh_token: body.refresh_token,
            expires_at: Date.now() + body.expires_in * 1000,
        };
    },

    async refreshToken(refreshToken: string) {
        const client = appClient();
        client.setRefreshToken(refreshToken);
        const { body } = await client.refreshAccessToken();
        return {
            access_token: body.access_token,
            refresh_token: body.refresh_token,
            expires_at: Date.now() + body.expires_in * 1000,
        };
    },

    async getCurrentUser(accessToken: string) {
        const { body } = await userClient(accessToken).getMe();
        return {
            id: body.id,
            display_name: body.display_name || 'Spotify User',
            images: body.images,
        };
    },

    async searchTracks(accessToken: string, query: string, limit = MAX_SEARCH_LIMIT) {
        const { body } = await userClient(accessToken).searchTracks(query, {
            limit: Math.min(Math.max(limit, 1), MAX_SEARCH_LIMIT),
        });
        return body.tracks?.items.map(toTrack) ?? [];
    },
};

export default SpotifyService;

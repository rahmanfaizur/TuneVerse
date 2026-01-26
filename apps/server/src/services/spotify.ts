import SpotifyWebApi from 'spotify-web-api-node';

const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    redirectUri: process.env.SPOTIFY_REDIRECT_URI || 'http://127.0.0.1:4000/api/spotify/callback'
});

export class SpotifyService {
    /**
     * Generate Spotify OAuth URL
     */
    static getAuthUrl(): string {
        const scopes = [
            'user-read-email',
            'user-read-private',
            'user-read-playback-state',
            'user-modify-playback-state',
            'streaming',
            'user-library-read',
            'user-top-read'
        ];

        return spotifyApi.createAuthorizeURL(scopes, 'tuneverse-state');
    }

    /**
     * Exchange authorization code for access token
     */
    static async exchangeCode(code: string) {
        try {
            const data = await spotifyApi.authorizationCodeGrant(code);
            return {
                access_token: data.body.access_token,
                refresh_token: data.body.refresh_token,
                expires_at: Date.now() + data.body.expires_in * 1000
            };
        } catch (error) {
            console.error('Error exchanging code:', error);
            throw error;
        }
    }

    /**
     * Refresh access token
     */
    static async refreshToken(refreshToken: string) {
        try {
            spotifyApi.setRefreshToken(refreshToken);
            const data = await spotifyApi.refreshAccessToken();
            return {
                access_token: data.body.access_token,
                expires_at: Date.now() + data.body.expires_in * 1000
            };
        } catch (error) {
            console.error('Error refreshing token:', error);
            throw error;
        }
    }

    /**
     * Get current user profile
     */
    static async getCurrentUser(accessToken: string) {
        try {
            spotifyApi.setAccessToken(accessToken);
            const data = await spotifyApi.getMe();
            return {
                id: data.body.id,
                display_name: data.body.display_name || 'Spotify User',
                email: data.body.email,
                product: data.body.product || 'free',
                images: data.body.images
            };
        } catch (error) {
            console.error('Error getting user:', error);
            throw error;
        }
    }

    /**
     * Search for tracks
     */
    static async searchTracks(accessToken: string, query: string, limit = 10) {
        try {
            spotifyApi.setAccessToken(accessToken);
            const data = await spotifyApi.searchTracks(query, { limit });

            return data.body.tracks?.items.map(track => ({
                id: track.id,
                title: track.name,
                artist: track.artists.map(a => a.name).join(', '),
                album: track.album.name,
                albumArt: track.album.images[0]?.url,
                duration: track.duration_ms,
                uri: track.uri
            })) || [];
        } catch (error) {
            console.error('Error searching tracks:', error);
            throw error;
        }
    }

    /**
     * Get track details
     */
    static async getTrack(accessToken: string, trackId: string) {
        try {
            spotifyApi.setAccessToken(accessToken);
            const data = await spotifyApi.getTrack(trackId);
            const track = data.body;

            return {
                id: track.id,
                title: track.name,
                artist: track.artists.map(a => a.name).join(', '),
                album: track.album.name,
                albumArt: track.album.images[0]?.url,
                duration: track.duration_ms,
                uri: track.uri
            };
        } catch (error) {
            console.error('Error getting track:', error);
            throw error;
        }
    }

    /**
     * Get recommendations based on seed tracks
     */
    static async getRecommendations(accessToken: string, seedTracks: string[], limit = 10) {
        try {
            spotifyApi.setAccessToken(accessToken);
            const data = await spotifyApi.getRecommendations({
                seed_tracks: seedTracks.slice(0, 5), // Max 5 seeds
                limit
            });

            return data.body.tracks.map(track => ({
                id: track.id,
                title: track.name,
                artist: track.artists.map(a => a.name).join(', '),
                album: track.album.name,
                albumArt: track.album.images[0]?.url,
                duration: track.duration_ms,
                uri: track.uri
            }));
        } catch (error) {
            console.error('Error getting recommendations:', error);
            throw error;
        }
    }
}

export default SpotifyService;

import express from 'express';
import SpotifyService from '../services/spotify';

const router = express.Router();

/**
 * GET /api/spotify/auth
 * Redirect to Spotify OAuth
 */
router.get('/auth', (req, res) => {
    const authUrl = SpotifyService.getAuthUrl();
    res.json({ authUrl });
});

/**
 * GET /api/spotify/callback
 * Handle OAuth callback from Spotify
 */
router.get('/callback', async (req, res) => {
    const { code } = req.query;

    const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
    if (!code || typeof code !== 'string') {
        return res.redirect(`${clientUrl}/lobby?error=no_code`);
    }

    try {
        const tokens = await SpotifyService.exchangeCode(code);
        const user = await SpotifyService.getCurrentUser(tokens.access_token);

        // Redirect to frontend with tokens in URL (will be moved to localStorage)
        const params = new URLSearchParams({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_at: tokens.expires_at.toString(),
            user: JSON.stringify(user)
        });

        res.redirect(`${clientUrl}/lobby?${params.toString()}`);
    } catch (error) {
        console.error('OAuth callback error:', error);
        res.redirect(`${clientUrl}/lobby?error=auth_failed`);
    }
});

/**
 * POST /api/spotify/refresh
 * Refresh access token
 */
router.post('/refresh', async (req, res) => {
    const { refresh_token } = req.body;

    if (!refresh_token) {
        return res.status(400).json({ error: 'refresh_token required' });
    }

    try {
        const tokens = await SpotifyService.refreshToken(refresh_token);
        res.json(tokens);
    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(401).json({ error: 'Failed to refresh token' });
    }
});

/**
 * GET /api/spotify/me
 * Get current user profile
 */
router.get('/me', async (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const user = await SpotifyService.getCurrentUser(token);
        res.json(user);
    } catch (error) {
        console.error('Get user error:', error);
        res.status(401).json({ error: 'Invalid token' });
    }
});

/**
 * GET /api/spotify/search
 * Search for tracks
 */
router.get('/search', async (req, res) => {
    const { q, limit } = req.query;
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    if (!q || typeof q !== 'string') {
        return res.status(400).json({ error: 'query required' });
    }

    try {
        const tracks = await SpotifyService.searchTracks(token, q, limit ? parseInt(limit as string) : 10);
        res.json(tracks);
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

/**
 * GET /api/spotify/track/:id
 * Get track details
 */
router.get('/track/:id', async (req, res) => {
    const { id } = req.params;
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const track = await SpotifyService.getTrack(token, id);
        res.json(track);
    } catch (error) {
        console.error('Get track error:', error);
        res.status(500).json({ error: 'Failed to get track' });
    }
});

/**
 * POST /api/spotify/recommendations
 * Get AI-powered recommendations
 */
router.post('/recommendations', async (req, res) => {
    const { seed_tracks, limit } = req.body;
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    if (!seed_tracks || !Array.isArray(seed_tracks)) {
        return res.status(400).json({ error: 'seed_tracks array required' });
    }

    try {
        const recommendations = await SpotifyService.getRecommendations(token, seed_tracks, limit || 10);
        res.json(recommendations);
    } catch (error) {
        console.error('Recommendations error:', error);
        res.status(500).json({ error: 'Failed to get recommendations' });
    }
});

export default router;

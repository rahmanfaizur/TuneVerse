import { randomBytes } from 'crypto';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '../config';
import SpotifyService from '../services/spotify';

const router = express.Router();

router.use(rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
}));

type PendingLogin = {
    tokens: Awaited<ReturnType<typeof SpotifyService.exchangeCode>>;
    user: Awaited<ReturnType<typeof SpotifyService.getCurrentUser>>;
    timer: NodeJS.Timeout;
};

// Tokens in a redirect URL end up in browser history and proxy logs. So the callback
// hands the browser a short-lived id, and the browser swaps it for the tokens here.
const pendingLogins = new Map<string, PendingLogin>();
const PENDING_LOGIN_TTL_MS = 60 * 1000;

const bearerToken = (header?: string) => header?.replace('Bearer ', '') || null;

router.get('/auth', (req, res) => {
    const { state } = req.query;

    // Generated and remembered by the browser, which checks it again on the way back.
    if (typeof state !== 'string' || !/^[a-f0-9]{32}$/.test(state)) {
        return res.status(400).json({ error: 'Invalid state' });
    }

    res.json({ authUrl: SpotifyService.getAuthUrl(state) });
});

router.get('/callback', async (req, res) => {
    const { code, state } = req.query;
    const lobbyUrl = `${config.clientUrl}/lobby`;

    if (typeof code !== 'string' || typeof state !== 'string') {
        return res.redirect(`${lobbyUrl}?spotify_error=denied`);
    }

    try {
        const tokens = await SpotifyService.exchangeCode(code);
        const user = await SpotifyService.getCurrentUser(tokens.access_token);

        const id = randomBytes(24).toString('hex');
        const timer = setTimeout(() => pendingLogins.delete(id), PENDING_LOGIN_TTL_MS);
        pendingLogins.set(id, { tokens, user, timer });

        const params = new URLSearchParams({ spotify_login: id, state });
        res.redirect(`${lobbyUrl}?${params.toString()}`);
    } catch (error) {
        console.error('Spotify callback failed:', error);
        res.redirect(`${lobbyUrl}?spotify_error=failed`);
    }
});

router.post('/session', (req, res) => {
    const { id } = req.body ?? {};
    const pending = typeof id === 'string' ? pendingLogins.get(id) : undefined;

    if (!pending) {
        return res.status(404).json({ error: 'Login expired, try connecting again' });
    }

    clearTimeout(pending.timer);
    pendingLogins.delete(id);
    res.json({ ...pending.tokens, user: pending.user });
});

router.post('/refresh', async (req, res) => {
    const { refresh_token } = req.body ?? {};

    if (typeof refresh_token !== 'string' || !refresh_token) {
        return res.status(400).json({ error: 'refresh_token required' });
    }

    try {
        res.json(await SpotifyService.refreshToken(refresh_token));
    } catch (error) {
        console.error('Spotify token refresh failed:', error);
        res.status(401).json({ error: 'Failed to refresh token' });
    }
});

router.get('/search', async (req, res) => {
    const { q, limit } = req.query;
    const token = bearerToken(req.headers.authorization);

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    if (typeof q !== 'string' || !q.trim()) {
        return res.status(400).json({ error: 'query required' });
    }

    try {
        const parsedLimit = typeof limit === 'string' ? parseInt(limit, 10) : NaN;
        const tracks = await SpotifyService.searchTracks(token, q, Number.isNaN(parsedLimit) ? undefined : parsedLimit);
        res.json(tracks);
    } catch (error) {
        console.error('Spotify search failed:', error);
        res.status(502).json({ error: 'Search failed' });
    }
});

export default router;

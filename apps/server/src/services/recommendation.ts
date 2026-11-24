import { GoogleGenerativeAI } from "@google/generative-ai";
import SpotifyService from "./spotify";
import { YouTubeService } from "./youtube";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");
// At busy times the free tier answers in about 20s, so 15 was cutting it off.
const GEMINI_TIMEOUT_MS = 30000;

// The "latest" aliases keep working when Google retires a specific version, which is
// what broke this feature last time. When one is overloaded (503), the other often isn't.
const GEMINI_MODELS = [process.env.GEMINI_MODEL || "gemini-flash-lite-latest", "gemini-flash-latest"]
    .filter((name, i, all) => all.indexOf(name) === i)
    .map((name) => genAI.getGenerativeModel({
        model: name,
        generationConfig: { responseMimeType: "application/json" },
    }, { timeout: GEMINI_TIMEOUT_MS }));

interface TrackContext {
    title: string;
    artist: string;
}

interface RecommendationResult {
    id: string;
    title: string;
    artist: string;
    thumbnail?: string;
    uri?: string; // For Spotify>
    source: 'youtube' | 'spotify';
}

export class RecommendationService {
    private static cache: Map<string, { timestamp: number, data: RecommendationResult[] }> = new Map();
    private static CACHE_TTL = 1000 * 60 * 60; // 1 hour

    /**
     * Gemini first, then Groq (both free tiers), and if every AI is down, a plain search
     * for the mood, so the vibe bubble always comes back with something.
     */
    static async getRecommendations(
        context: TrackContext[],
        source: 'youtube' | 'spotify',
        spotifyToken?: string,
        mood?: string
    ): Promise<RecommendationResult[]> {
        // Generate cache key based on seeds
        const seedList = context.slice(0, 5).map(t => `"${t.title}" by ${t.artist}`).join(", ");
        const cacheKey = `${source}:${seedList}:${mood || 'default'}`;

        // Check cache
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
            console.log("Returning cached recommendations for:", seedList);
            return cached.data;
        }

        let suggestions: { title: string; artist: string }[] = [];

        // 1. Try Gemini
        if (process.env.GOOGLE_API_KEY) {
            try {
                console.log(`Attempting Gemini recommendations... (Mood: ${mood || 'None'})`);
                suggestions = await this.getGeminiRecommendations(seedList, mood);
            } catch (error: any) {
                console.warn("Gemini recommendation failed:", error);
                if (error.status === 429 || error.message?.includes("429") || error.message?.includes("Quota")) {
                    console.warn("Gemini rate limit exceeded. Switching to fallback.");
                }
            }
        }

        // 2. Groq's free tier, if a key is set and Gemini came back empty-handed
        if (suggestions.length === 0 && process.env.GROQ_API_KEY) {
            try {
                console.log("Attempting Groq recommendations (fallback)...");
                suggestions = await this.getGroqRecommendations(seedList, mood);
            } catch (error: any) {
                console.error("Groq recommendation failed:", error.message);
            }
        }

        // 3. No AI answered: search for the mood itself instead
        if (suggestions.length === 0) {
            console.warn("No AI answered, falling back to a plain search.");
            return this.searchFallback(context, source, spotifyToken, mood);
        }

        // 4. Find each suggestion on the room's source
        const results: RecommendationResult[] = [];

        if (source === 'spotify' && spotifyToken) {
            const found = await Promise.all(suggestions.map(async (suggestion) => {
                try {
                    const [track] = await SpotifyService.searchTracks(spotifyToken, `${suggestion.title} ${suggestion.artist}`, 1);
                    return track && {
                        id: track.id,
                        title: track.title,
                        artist: track.artist,
                        thumbnail: track.albumArt,
                        uri: track.uri,
                        source: 'spotify' as const,
                    };
                } catch (e) {
                    console.error(`Failed to find Spotify track: ${suggestion.title}`, e);
                }
            }));
            results.push(...found.filter((item) => !!item));
        } else {
            const found = await Promise.all(suggestions.map(async (suggestion) => {
                try {
                    const [video] = await YouTubeService.search(`${suggestion.title} ${suggestion.artist}`, 1);
                    return video && {
                        id: video.id,
                        title: video.title,
                        artist: suggestion.artist,
                        thumbnail: video.thumbnail,
                        channelTitle: suggestion.artist,
                        source: 'youtube' as const,
                    };
                } catch (e) {
                    console.error(`Failed to find YouTube video: ${suggestion.title}`, e);
                }
            }));
            results.push(...found.filter((item) => !!item));
        }

        // Update cache
        if (results.length > 0) {
            this.cache.set(cacheKey, { timestamp: Date.now(), data: results });
        }

        return results;
    }

    private static async getGeminiRecommendations(seedList: string, mood?: string): Promise<{ title: string; artist: string }[]> {
        let prompt = `
            You are a music recommendation engine. The user is listening to: ${seedList}.
            Recommend 5 similar songs that fit the vibe and genre.
        `;

        if (mood) {
            prompt += `\nThe user specifically requested songs with a "${mood}" mood/vibe. Prioritize this mood.`;
        }

        prompt += `
            Return ONLY a JSON array of objects with "title" and "artist" keys. 
            Do not include markdown formatting or explanations.
            Example: [{"title": "Song Name", "artist": "Artist Name"}]
        `;

        let lastError: unknown;
        let result;
        for (const model of GEMINI_MODELS) {
            try {
                result = await model.generateContent(prompt);
                break;
            } catch (error) {
                lastError = error;
                console.warn(`Gemini ${model.model} failed, trying the next one:`, (error as Error).message?.slice(0, 120));
            }
        }
        if (!result) throw lastError;
        const response = result.response;
        const text = response.text().replace(/```json|```/g, '').trim();

        try {
            return JSON.parse(text);
        } catch (e) {
            console.error("Failed to parse Gemini response:", text);
            return [];
        }
    }

    // Groq speaks the OpenAI chat format. Free tier: a key from console.groq.com, no card.
    private static async getGroqRecommendations(seedList: string, mood?: string): Promise<{ title: string; artist: string }[]> {
        const prompt = `You are a music recommendation engine. The user is listening to: ${seedList}.
Recommend 5 similar songs that fit the vibe and genre.${mood ? `\nThe user asked for a "${mood}" mood. Prioritize it.` : ""}
Reply with ONLY a JSON object: {"songs": [{"title": "Song Name", "artist": "Artist Name"}]}`;

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
                messages: [{ role: "user", content: prompt }],
                response_format: { type: "json_object" },
                max_tokens: 500,
                temperature: 0.7,
            }),
            signal: AbortSignal.timeout(20000),
        });
        if (!response.ok) throw new Error(`Groq ${response.status}: ${(await response.text()).slice(0, 200)}`);

        const result = await response.json() as { choices?: { message?: { content?: string } }[] };
        try {
            const parsed = JSON.parse(result.choices?.[0]?.message?.content ?? "{}");
            const songs = Array.isArray(parsed) ? parsed : parsed.songs;
            return Array.isArray(songs) ? songs.filter((s) => s?.title) : [];
        } catch {
            return [];
        }
    }

    // Last resort, no AI needed: search the room's source for the mood (or the current song).
    private static async searchFallback(
        context: TrackContext[],
        source: 'youtube' | 'spotify',
        spotifyToken?: string,
        mood?: string
    ): Promise<RecommendationResult[]> {
        const seed = context[0];
        const query = mood ? `${mood} song official audio` : seed && seed.title !== "Trending" ? `songs like ${seed.title} ${seed.artist}` : "popular songs";
        try {
            if (source === 'spotify' && spotifyToken) {
                const tracks = await SpotifyService.searchTracks(spotifyToken, query, 5);
                return tracks.map((track) => ({
                    id: track.id, title: track.title, artist: track.artist,
                    thumbnail: track.albumArt, uri: track.uri, source: 'spotify' as const,
                }));
            }
            const videos = await YouTubeService.search(query, 5);
            return videos.map((video) => ({
                id: video.id, title: video.title, artist: video.channelTitle,
                thumbnail: video.thumbnail, source: 'youtube' as const,
            }));
        } catch (error) {
            console.error("Search fallback failed:", error);
            return [];
        }
    }
}

import { fetch, Agent } from "undici";
import { GoogleGenerativeAI } from "@google/generative-ai";
import SpotifyService from "./spotify";
import { YouTubeService } from "./youtube";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");
const GEMINI_TIMEOUT_MS = 15000;

// The "latest" alias keeps working when Google retires a specific version, which is
// what broke this feature last time.
const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-flash-lite-latest",
    generationConfig: { responseMimeType: "application/json" },
}, { timeout: GEMINI_TIMEOUT_MS });

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
     * Get recommendations using Hybrid approach (Gemini -> Fallback to Hugging Face)
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

        // 2. Fallback to Hugging Face if Gemini failed or returned nothing
        if (suggestions.length === 0 && process.env.HF_TOKEN) {
            try {
                console.log("Attempting Hugging Face recommendations (Fallback)...");
                suggestions = await this.getHuggingFaceRecommendations(seedList, mood);
            } catch (error: any) {
                console.error("Hugging Face recommendation failed:", error.message);
            }
        }

        if (suggestions.length === 0) {
            console.warn("All recommendation services failed or returned empty.");
            return [];
        }

        // 3. Fetch Details based on Source
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

        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text().replace(/```json|```/g, '').trim();

        try {
            return JSON.parse(text);
        } catch (e) {
            console.error("Failed to parse Gemini response:", text);
            return [];
        }
    }

    private static async getHuggingFaceRecommendations(seedList: string, mood?: string): Promise<{ title: string; artist: string }[]> {
        const modelId = process.env.HF_MODEL || "openai/gpt-oss-20b";
        const apiUrl = "https://router.huggingface.co/v1/chat/completions";

        if (!process.env.HF_TOKEN) {
            console.error("HF_TOKEN is missing in environment variables!");
            return [];
        }

        let promptContent = `You are a music recommendation engine. The user is listening to: ${seedList}.
Recommend 5 similar songs that fit the vibe and genre.`;

        if (mood) {
            promptContent += `\nThe user specifically requested songs with a "${mood}" mood/vibe. Prioritize this mood.`;
        }

        promptContent += `\n\nReturn ONLY a JSON array of objects with "title" and "artist" keys.
Do not include markdown formatting or explanations.
Example: [{"title": "Song Name", "artist": "Artist Name"}]`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        try {
            const dispatcher = new Agent({
                connect: {
                    timeout: 30000 // 30 seconds connection timeout
                }
            });

            const response = await fetch(apiUrl, {
                dispatcher,
                headers: {
                    Authorization: `Bearer ${process.env.HF_TOKEN}`,
                    "Content-Type": "application/json",
                },
                method: "POST",
                body: JSON.stringify({
                    model: modelId,
                    messages: [
                        { role: "user", content: promptContent }
                    ],
                    max_tokens: 500,
                    temperature: 0.7
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HF API Error: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const result = await response.json() as any;
            let text = "";

            if (result.choices && result.choices.length > 0 && result.choices[0].message) {
                text = result.choices[0].message.content;
            } else {
                console.warn("Unexpected HF response format:", result);
                return [];
            }

            // Clean up text to find JSON
            text = text.replace(/```json|```/g, '').trim();

            const jsonStart = text.indexOf('[');
            const jsonEnd = text.lastIndexOf(']');

            if (jsonStart !== -1 && jsonEnd !== -1) {
                text = text.substring(jsonStart, jsonEnd + 1);
            }

            try {
                return JSON.parse(text);
            } catch (e) {
                console.error("Failed to parse HF response:", text);
                return [];
            }
        } catch (error: any) {
            clearTimeout(timeoutId);
            console.error("Hugging Face recommendation failed:", error);
            if (error.name === 'AbortError') {
                console.error("Request timed out after 30 seconds");
            }
            if (error.cause) console.error("Cause:", error.cause);
            return [];
        }
    }
}

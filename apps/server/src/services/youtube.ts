import { Innertube, YTNodes } from "youtubei.js";

export interface YouTubeVideo {
    id: string;
    title: string;
    thumbnail: string;
    channelTitle: string;
}

let clientPromise: Promise<Innertube> | null = null;

// Creating a client fetches YouTube's config, so we only want to do it once.
const getClient = () => {
    clientPromise ??= Innertube.create({ retrieve_player: false }).catch((error) => {
        clientPromise = null;
        throw error;
    });
    return clientPromise;
};

const toVideo = (video: YTNodes.Video): YouTubeVideo => ({
    id: video.video_id,
    title: video.title.toString(),
    thumbnail: video.best_thumbnail?.url ?? `https://i.ytimg.com/vi/${video.video_id}/hqdefault.jpg`,
    channelTitle: video.author?.name ?? "",
});

// Real uploads should beat the slowed + reverb re-uploads that often rank first.
const looksOfficial = ({ title, channelTitle }: YouTubeVideo) =>
    /vevo|- topic$/i.test(channelTitle) || /official (music )?(video|audio)/i.test(title);

// Works for a bare link or anything else someone might paste in.
export const parseYouTubeLink = (input: string) => {
    let url: URL;
    try {
        url = new URL(input.trim());
    } catch {
        return null;
    }

    const host = url.hostname.replace(/^(www|m|music)\./, "");
    if (host === "youtu.be") return { videoId: url.pathname.slice(1) || null, playlistId: url.searchParams.get("list") };
    if (host !== "youtube.com") return null;

    return { videoId: url.searchParams.get("v"), playlistId: url.searchParams.get("list") };
};

export const YouTubeService = {
    async search(query: string, limit = 8): Promise<YouTubeVideo[]> {
        const youtube = await getClient();
        const results = await youtube.search(query, { type: "video" });
        const videos = results.videos.filterType(YTNodes.Video).map(toVideo);

        return [...videos.filter(looksOfficial), ...videos.filter((video) => !looksOfficial(video))].slice(0, limit);
    },

    async getPlaylistVideos(playlistId: string, limit = 25): Promise<YouTubeVideo[]> {
        const youtube = await getClient();
        const playlist = await youtube.getPlaylist(playlistId);

        return playlist.items
            .filterType(YTNodes.LockupView)
            .filter((item) => item.content_type === "VIDEO" && !!item.content_id)
            .slice(0, limit)
            .map((item) => ({
                id: item.content_id as string,
                title: item.metadata?.title?.toString() ?? "Untitled",
                thumbnail: `https://i.ytimg.com/vi/${item.content_id}/hqdefault.jpg`,
                channelTitle: "",
            }));
    },
};

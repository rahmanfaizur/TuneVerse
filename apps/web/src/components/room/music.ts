import { EVENTS } from "@tuneverse/shared";
import { Socket } from "socket.io-client";

export type MusicSource = "youtube" | "spotify";

export interface MusicResult {
    id: string;
    title: string;
    thumbnail?: string;
    channelTitle?: string;
    artist?: string;
    album?: string;
    uri?: string;
    source?: MusicSource;
}

export const SOURCE_NAMES: Record<MusicSource, string> = {
    youtube: "YouTube",
    spotify: "Spotify",
};

export const addToQueue = (socket: Socket, item: MusicResult, source: MusicSource) => {
    socket.emit(EVENTS.QUEUE_ADD, {
        videoId: item.id,
        title: item.title,
        thumbnail: item.thumbnail,
        source: item.source ?? source,
        uri: item.uri,
        artist: item.artist ?? item.channelTitle,
        album: item.album,
    });
};

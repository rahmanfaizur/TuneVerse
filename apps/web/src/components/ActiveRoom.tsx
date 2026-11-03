"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EVENTS } from "@tuneverse/shared";
import { toast } from "sonner";
import { useSocket } from "../context/SocketContext";
import { useSpotify } from "../context/SpotifyContext";
import Button from "./Button";
import Chat from "./Chat";
import LoadingScreen from "./LoadingScreen";
import { startNavigationProgress } from "./NavigationProgress";
import QueueSystem from "./QueueSystem";
import VideoPlayer from "./VideoPlayer";
import MusicSearch from "./room/MusicSearch";
import { MusicSource } from "./room/music";

type Tab = "queue" | "chat" | "people";

export default function ActiveRoom({ username }: { username: string }) {
    const { socket, room, leaveRoom } = useSocket();
    const { isConnected: spotifyConnected, spotifyUser, connectSpotify, disconnectSpotify, isConnecting } = useSpotify();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState<Tab>("queue");
    const [source, setSource] = useState<MusicSource>("youtube");
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLeaving, setIsLeaving] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const activeTabRef = useRef(activeTab);
    activeTabRef.current = activeTab;

    useEffect(() => {
        if (!socket) return;

        const countUnread = () => {
            if (activeTabRef.current !== "chat") setUnreadCount((count) => count + 1);
        };
        socket.on(EVENTS.CHAT_RECEIVE, countUnread);
        return () => {
            socket.off(EVENTS.CHAT_RECEIVE, countUnread);
        };
    }, [socket]);

    if (!room) return <LoadingScreen message="Opening the room" />;

    const openTab = (tab: Tab) => {
        setActiveTab(tab);
        if (tab === "chat") setUnreadCount(0);
    };

    const pickSource = (picked: MusicSource) => {
        setSource(picked);
        // Wait a tick, since the input only exists once the source has changed.
        setTimeout(() => {
            searchInputRef.current?.focus();
            searchInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 0);
    };

    const copyInvite = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            toast("Invite link copied");
        } catch {
            toast(`Copy this code instead: ${room.id}`);
        }
    };

    const leave = () => {
        setIsLeaving(true);
        startNavigationProgress();
        leaveRoom();
        router.push("/lobby");
    };

    const hostName = room.users.find((u) => u.id === room.hostId)?.username;
    const tabs: { id: Tab; label: string; badge?: number }[] = [
        { id: "queue", label: "Up next", badge: room.queue.length },
        { id: "chat", label: "Chat", badge: unreadCount },
        { id: "people", label: "People", badge: room.users.length },
    ];

    return (
        <div className="mx-auto w-full max-w-[1200px] px-5 pb-16 md:px-8">
            <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-4">
                <div className="flex min-w-0 items-baseline gap-3">
                    <Link href="/lobby" onClick={() => leaveRoom()} className="text-xl font-semibold tracking-tight transition-colors hover:text-signal">
                        TuneVerse
                    </Link>
                    <span className="text-border">/</span>
                    <h1 className="min-w-0 truncate text-lg font-medium">{room.name || `Room ${room.id}`}</h1>
                </div>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                    <span className="text-muted-foreground">
                        {room.hostId === socket?.id ? "You're the host" : hostName ? `Hosted by ${hostName}` : "Host stepped out"}
                    </span>
                    {spotifyConnected ? (
                        <button onClick={disconnectSpotify} className="text-muted-foreground transition-colors hover:text-signal" title="Disconnect Spotify">
                            Spotify: {spotifyUser?.display_name ?? "connected"}
                        </button>
                    ) : (
                        <Button variant="quiet" onClick={connectSpotify} loading={isConnecting} loadingText="Opening Spotify" className="!text-sm">
                            Connect Spotify
                        </Button>
                    )}
                    <button onClick={copyInvite} className="rounded-full bg-muted px-4 py-2 font-medium transition-opacity hover:opacity-80">
                        Copy invite · <span className="tracking-wider">{room.id}</span>
                    </button>
                    <Button variant="quiet" onClick={leave} loading={isLeaving} loadingText="Leaving" className="!text-sm">
                        Leave
                    </Button>
                </div>
            </header>

            <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_21rem]">
                <div className="min-w-0 space-y-5">
                    <div className="overflow-hidden rounded-3xl bg-muted">
                        <VideoPlayer room={room} socket={socket} onPickSource={pickSource} />
                    </div>
                    <MusicSearch socket={socket} source={source} onSourceChange={setSource} inputRef={searchInputRef} />
                </div>

                <aside className="flex h-[30rem] flex-col overflow-hidden rounded-3xl border border-border lg:sticky lg:top-4 lg:h-[calc(100vh-6rem)] lg:max-h-[42rem]">
                    <div role="tablist" className="flex shrink-0 border-b border-border">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                role="tab"
                                aria-selected={activeTab === tab.id}
                                onClick={() => openTab(tab.id)}
                                className={`-mb-px flex-1 border-b-2 py-3.5 text-sm transition-colors ${activeTab === tab.id ? "border-signal font-medium" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                            >
                                {tab.label}
                                {!!tab.badge && (
                                    <span className={`ml-1.5 text-xs ${tab.id === "chat" ? "rounded-full bg-signal px-1.5 py-0.5 text-signal-foreground" : "text-muted-foreground"}`}>
                                        {tab.badge}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="min-h-0 flex-1">
                        {activeTab === "queue" && <QueueSystem room={room} socket={socket} />}

                        {/* Stays mounted so messages keep arriving while another tab is open. */}
                        <div className={activeTab === "chat" ? "h-full" : "hidden"}>
                            <Chat username={username} initialMessages={room.messages} />
                        </div>

                        {activeTab === "people" && (
                            <ul className="h-full overflow-y-auto">
                                {room.users.map((user) => (
                                    <li key={user.id} className="flex items-center gap-3 border-b border-border px-4 py-3">
                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted font-medium">
                                            {(user.username?.[0] ?? "?").toUpperCase()}
                                        </span>
                                        <span className="min-w-0 flex-1 truncate text-[15px]">
                                            {user.username}
                                            {user.id === socket?.id && <span className="text-muted-foreground"> (you)</span>}
                                        </span>
                                        {room.hostId === user.id && <span className="text-sm font-medium text-signal">Host</span>}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </aside>
            </div>
        </div>
    );
}

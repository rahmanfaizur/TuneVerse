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
import PaperPicker from "./poster/PaperPicker";
import Ticket from "./poster/Ticket";
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
    // The chat listener below is set up once, so it reads the open tab through a ref.
    const activeTabRef = useRef(activeTab);
    useEffect(() => {
        activeTabRef.current = activeTab;
    }, [activeTab]);

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

    const hostLine = room.hostId === socket?.id ? "You're the host" : hostName ? `Hosted by ${hostName}` : "Host stepped out";

    return (
        <div className="mx-auto w-full max-w-[1200px] px-5 pb-16 md:px-8">
            <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b-2 border-rule py-4">
                <Link href="/lobby" onClick={() => leaveRoom()} className="display text-[1.75rem] leading-none transition-colors hover:text-blue">
                    TuneVerse
                </Link>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                    <PaperPicker />
                    {spotifyConnected ? (
                        <button onClick={disconnectSpotify} className="ink-link font-semibold" title="Disconnect Spotify">
                            Spotify: {spotifyUser?.display_name ?? "connected"}
                        </button>
                    ) : (
                        <Button variant="quiet" onClick={connectSpotify} loading={isConnecting} loadingText="Opening Spotify" className="!text-sm">
                            Connect Spotify
                        </Button>
                    )}
                    <Button variant="outline" onClick={leave} loading={isLeaving} loadingText="Leaving" className="!px-4 !py-1.5 !text-sm">
                        Leave
                    </Button>
                </div>
            </header>

            <div className="flex flex-wrap items-end justify-between gap-4 py-5">
                <div className="min-w-0">
                    <h1 className="display break-words text-5xl text-blue md:text-6xl">{room.name || `Room ${room.id}`}</h1>
                    <p className="mt-2 text-[15px]">{hostLine} · {room.users.length} listening</p>
                </div>
                <Ticket
                    as="button"
                    onClick={copyInvite}
                    title="Copy the invite link"
                    className="group bg-pink text-left text-on-pink"
                    stubWidth="6.5rem"
                    stubClassName="bg-blue px-2 text-paper transition-colors group-hover:bg-ink"
                    stub={<span className="font-bold tracking-widest">{room.id}</span>}
                >
                    <span className="block px-4 py-2.5">
                        <span className="label block">Invite</span>
                        <span className="block font-bold">Copy link</span>
                    </span>
                </Ticket>
            </div>

            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
                <div className="min-w-0 space-y-6">
                    <div className="overflow-hidden border-2 border-rule">
                        <VideoPlayer room={room} socket={socket} onPickSource={pickSource} />
                    </div>
                    <MusicSearch socket={socket} source={source} onSourceChange={setSource} inputRef={searchInputRef} />
                </div>

                <aside className="flex h-[30rem] flex-col overflow-hidden border-2 border-rule lg:sticky lg:top-4 lg:h-[calc(100vh-6rem)] lg:max-h-[42rem]">
                    <div role="tablist" className="flex shrink-0 border-b-2 border-rule">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                role="tab"
                                aria-selected={activeTab === tab.id}
                                onClick={() => openTab(tab.id)}
                                className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === tab.id ? "bg-ink text-paper" : "text-ink hover:bg-wash"}`}
                            >
                                {tab.label}
                                {!!tab.badge && (
                                    <span className={`ml-1.5 text-xs ${tab.id === "chat" ? "bg-pink px-1.5 py-0.5 text-on-pink" : "opacity-70"}`}>
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
                                    <li key={user.id} className="flex items-center gap-3 border-b-2 border-wash px-4 py-3">
                                        <span className="display flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-wash text-lg">
                                            {(user.username?.[0] ?? "?").toUpperCase()}
                                        </span>
                                        <span className="min-w-0 flex-1 truncate text-[15px]">
                                            {user.username}
                                            {user.id === socket?.id && <span className="text-soft"> (you)</span>}
                                        </span>
                                        {room.hostId === user.id && <span className="label bg-pink text-on-pink px-2 py-1">Host</span>}
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

"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { EVENTS, RoomSummary } from "@tuneverse/shared";
import { toast } from "sonner";
import { useSocket } from "../../context/SocketContext";
import { useAuth } from "../../context/AuthContext";
import Button from "../../components/Button";
import LoadingScreen from "../../components/LoadingScreen";
import { startNavigationProgress } from "../../components/NavigationProgress";
import Spinner from "../../components/Spinner";
import { getApiUrl } from "../../lib/api";

const REFRESH_EVERY_MS = 10000;
const CREATE_TIMEOUT_MS = 8000;

type Filter = "all" | "mine";

const SOURCE_LABEL = { youtube: "YouTube", spotify: "Spotify" };

const roomTitle = (room: RoomSummary) => room.name || `Room ${room.id}`;

const listeners = (count: number) => {
    if (count === 0) return "Nobody here yet";
    return count === 1 ? "1 listening" : `${count} listening`;
};

// Accepts a bare code or a pasted invite link.
const parseRoomCode = (input: string) => {
    const fromLink = input.match(/\/room\/([^/?#\s]+)/)?.[1];
    return (fromLink ?? input).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
};

export default function LobbyPage() {
    const { socket, isConnected, fingerprint, error, login: socketLogin, leaveRoom } = useSocket();
    const { user, token, logout, isLoading } = useAuth();
    const router = useRouter();

    const [filter, setFilter] = useState<Filter>("all");
    const [rooms, setRooms] = useState<RoomSummary[] | null>(null);
    const [roomName, setRoomName] = useState("");
    const [roomCode, setRoomCode] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [joiningId, setJoiningId] = useState<string | null>(null);
        const createTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    const fetchRooms = useCallback(async () => {
        try {
            const res = await fetch(`${getApiUrl()}/api/rooms${filter === "mine" ? "/my" : ""}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });
            if (!res.ok) throw new Error(`Room list failed with ${res.status}`);
            setRooms(await res.json());
        } catch (e) {
            // Keep showing what we have, the next refresh will probably work.
            console.error(e);
            setRooms((current) => current ?? []);
        }
    }, [filter, token]);

    useEffect(() => {
        if (!user && !isLoading) router.push("/");
    }, [user, isLoading, router]);

    // Arriving here with the back button should still take you out of the last room.
    useEffect(() => {
        leaveRoom();
    }, [leaveRoom]);

    useEffect(() => {
        if (user && !isConnected && socket && !socket.connected) {
            socketLogin(user.username);
        }
    }, [user, isConnected, socket, socketLogin]);

    useEffect(() => {
        if (!user) return;

        fetchRooms();
        const timer = setInterval(fetchRooms, REFRESH_EVERY_MS);
        return () => clearInterval(timer);
    }, [user, fetchRooms]);

    useEffect(() => {
        if (!socket) return;

        const handleCreated = ({ roomId }: { roomId: string }) => {
            if (createTimeout.current) clearTimeout(createTimeout.current);
            router.push(`/room/${roomId}`);
        };
        socket.on(EVENTS.ROOM_CREATED, handleCreated);
        return () => {
            socket.off(EVENTS.ROOM_CREATED, handleCreated);
            if (createTimeout.current) clearTimeout(createTimeout.current);
        };
    }, [socket, router]);

    const openRoom = (id: string) => {
        setJoiningId(id);
        startNavigationProgress();
        router.push(`/room/${id}`);
    };

    const createRoom = (e: FormEvent) => {
        e.preventDefault();
        if (!socket || !user || isCreating) return;

        setIsCreating(true);
        startNavigationProgress();
        socket.emit(EVENTS.ROOM_CREATE, {
            roomName: roomName.trim() || `${user.username}'s room`,
            isPersistent: !user.isGuest,
            username: user.username,
            fingerprint,
        });

        createTimeout.current = setTimeout(() => {
            setIsCreating(false);
            toast("That didn't go through. Try again?");
        }, CREATE_TIMEOUT_MS);
    };

    const joinByCode = (e: FormEvent) => {
        e.preventDefault();
        if (roomCode) openRoom(roomCode);
    };

    if (error) {
        return (
            <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
                <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">Can&apos;t reach the server</h1>
                <p className="mt-3 max-w-md text-lg text-muted-foreground">It might be waking up. Give it a moment and try again.</p>
                <Button onClick={() => window.location.reload()} className="mt-6">Try again</Button>
            </main>
        );
    }

    if (!isConnected || !socket) {
        return <LoadingScreen message="Getting the lobby ready" />;
    }

    const sorted = [...(rooms ?? [])].sort((a, b) => b.users.length - a.users.length);
    const cover = sorted[0];
    const others = sorted.slice(1);
    const isFirstLoad = rooms === null;

    return (
        <main className="mx-auto min-h-screen w-full max-w-6xl px-5 md:px-8">
            <header className="flex items-center justify-between gap-4 py-5">
                <span className="text-xl font-semibold tracking-tight">TuneVerse</span>
                <span className="flex items-center gap-4 text-sm">
                    <span className="hidden text-muted-foreground sm:inline">{user?.username}</span>
                    <button onClick={logout} className="underline-offset-4 transition-colors hover:text-signal hover:underline">Sign out</button>
                </span>
            </header>

            <div className="pb-6 pt-3 text-center md:pb-8 md:pt-5">
                <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
                    What are we <em>listening</em> to?
                </h1>
                <p className="mt-2 text-muted-foreground md:text-lg">Start a room, or jump into one that&apos;s already playing.</p>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(20rem,1fr)]">
                <section aria-label="Featured room" className="min-h-[20rem] min-w-0">
                    {isFirstLoad ? (
                        <div className="skeleton h-full min-h-[20rem] rounded-3xl" />
                    ) : cover ? (
                        <button
                            onClick={() => openRoom(cover.id)}
                            disabled={!!joiningId}
                            className="group relative flex h-full min-h-[20rem] w-full flex-col justify-end overflow-hidden rounded-3xl bg-muted p-6 text-left md:p-8"
                        >
                            {cover.nowPlaying?.artwork && (
                                <>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={cover.nowPlaying.artwork} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]" />
                                    <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10" />
                                </>
                            )}
                            <span className={`relative block ${cover.nowPlaying?.artwork ? "text-white" : ""}`}>
                                <span className="inline-flex items-center gap-2 text-sm font-medium">
                                    <span className="h-2 w-2 animate-pulse rounded-full bg-signal" />
                                    Live now
                                </span>
                                <span className="mt-2 block break-words text-3xl font-semibold leading-tight tracking-tight md:text-4xl">{roomTitle(cover)}</span>
                                <span className={`mt-1 block truncate text-[15px] ${cover.nowPlaying?.artwork ? "text-white/80" : "text-muted-foreground"}`}>
                                    {cover.nowPlaying ? `${cover.nowPlaying.title} · ${SOURCE_LABEL[cover.nowPlaying.source]}` : "Nothing playing yet"}
                                </span>
                                <span className="mt-4 flex items-center justify-between gap-4">
                                    <span className="text-[15px]">{listeners(cover.users.length)}</span>
                                    <span className="inline-flex items-center gap-2 rounded-full bg-signal px-5 py-2.5 text-[15px] font-medium text-signal-foreground">
                                        {joiningId === cover.id && <Spinner />}
                                        {joiningId === cover.id ? "Joining" : "Join room"}
                                    </span>
                                </span>
                            </span>
                        </button>
                    ) : (
                        <div className="flex h-full min-h-[20rem] flex-col justify-center rounded-3xl bg-muted p-6 md:p-10">
                            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
                                {filter === "mine" ? "You don't have any rooms running" : "No rooms are live right now"}
                            </h2>
                            <p className="mt-1 text-muted-foreground">Getting one going takes about ten seconds.</p>
                            <ol className="mt-6 space-y-3 text-[15px]">
                                {["Start a room and give it a name", "Send the link to your friends", "Play anything from YouTube or Spotify"].map((step, i) => (
                                    <li key={step} className="flex items-center gap-3">
                                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-background text-sm font-medium">{i + 1}</span>
                                        {step}
                                    </li>
                                ))}
                            </ol>
                        </div>
                    )}
                </section>

                <div className="flex flex-col gap-5">
                    <form onSubmit={createRoom} className="rounded-3xl border border-border p-6">
                        <label htmlFor="room-name" className="block text-xl font-semibold tracking-tight">Start a room</label>
                        <p className="mt-0.5 text-[15px] text-muted-foreground">Then play from YouTube or Spotify.</p>
                        <input
                            id="room-name"
                            value={roomName}
                            maxLength={60}
                            onChange={(e) => setRoomName(e.target.value)}
                            placeholder={`${user?.username}'s room`}
                            className="field mt-3"
                        />
                        <Button type="submit" loading={isCreating} loadingText="Setting it up" className="mt-3 w-full">
                            Start room
                        </Button>
                    </form>

                    <form onSubmit={joinByCode} className="rounded-3xl border border-border p-6">
                        <label htmlFor="room-code" className="block text-xl font-semibold tracking-tight">Have a code?</label>
                        <p className="mt-0.5 text-[15px] text-muted-foreground">Type it in, or paste an invite link.</p>
                        <div className="mt-3 flex gap-2">
                            <input
                                id="room-code"
                                value={roomCode}
                                onChange={(e) => setRoomCode(parseRoomCode(e.target.value))}
                                placeholder="ABC123"
                                autoComplete="off"
                                spellCheck={false}
                                className="field min-w-0 flex-1 tracking-widest"
                            />
                            <Button type="submit" variant="outline" disabled={!roomCode} loading={!!joiningId && joiningId === roomCode} loadingText="Joining" className="shrink-0">
                                Join
                            </Button>
                        </div>
                    </form>
                </div>
            </div>

            <section className="pb-20 pt-8">
                <div className="flex items-center justify-between gap-4">
                    <h2 className="text-xl font-semibold tracking-tight">More live rooms</h2>
                    <div className="flex rounded-full bg-muted p-1 text-sm" role="group" aria-label="Which rooms to show">
                        {(["all", "mine"] as const).map((option) => (
                            <button
                                key={option}
                                aria-pressed={filter === option}
                                onClick={() => {
                                    if (option === filter) return;
                                    setRooms(null);
                                    setFilter(option);
                                }}
                                className={`rounded-full px-3.5 py-1 transition-colors ${filter === option ? "bg-background font-medium shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                            >
                                {option === "all" ? "Everyone" : "Yours"}
                            </button>
                        ))}
                    </div>
                </div>

                {isFirstLoad ? (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
                        {[0, 1, 2].map((i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
                    </div>
                ) : others.length === 0 ? (
                    <p className="mt-3 text-[15px] text-muted-foreground">
                        {cover ? "That's the only room going right now." : "Nothing here yet."}
                    </p>
                ) : (
                    <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {others.map((room) => (
                            <li key={room.id} className="queue-row">
                                <button
                                    onClick={() => openRoom(room.id)}
                                    disabled={!!joiningId}
                                    className="flex w-full items-center gap-3 rounded-2xl border border-border p-3 text-left transition-colors hover:bg-muted"
                                >
                                    {room.nowPlaying?.artwork ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={room.nowPlaying.artwork} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                                    ) : (
                                        <span className="h-14 w-14 shrink-0 rounded-xl bg-muted" />
                                    )}
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate font-medium">{roomTitle(room)}</span>
                                        <span className="block truncate text-sm text-muted-foreground">
                                            {room.nowPlaying ? room.nowPlaying.title : "Nothing playing yet"}
                                        </span>
                                        <span className="block text-sm text-muted-foreground">{listeners(room.users.length)}</span>
                                    </span>
                                    {joiningId === room.id && <Spinner className="shrink-0 text-signal" />}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </main>
    );
}

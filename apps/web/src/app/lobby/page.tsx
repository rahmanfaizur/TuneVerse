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
    if (count === 0) return "Nobody in yet";
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
    const [today, setToday] = useState("");
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

    useEffect(() => {
        setToday(new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" }));
    }, []);

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
            <main className="flex min-h-screen flex-col justify-center px-6 md:px-16">
                <h1 className="font-serif text-6xl italic leading-none tracking-tight md:text-9xl">No signal.</h1>
                <p className="mt-6 max-w-md text-lg text-muted-foreground">
                    We can&apos;t reach the server right now. It might be waking up, so give it a moment.
                </p>
                <Button onClick={() => window.location.reload()} className="mt-8 self-start">Try again</Button>
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
        <main className="min-h-screen overflow-x-hidden">
            <div className="flex items-center justify-between gap-4 px-5 pt-5 text-sm md:px-10">
                <span className="text-muted-foreground">{today}</span>
                <span className="flex items-center gap-5">
                    <span className="hidden text-muted-foreground sm:inline">Signed in as {user?.username}</span>
                    <button onClick={logout} className="underline underline-offset-4 transition-colors hover:text-signal">Sign out</button>
                </span>
            </div>

            <h1 className="masthead px-4 text-center font-serif leading-[0.92] tracking-[-0.03em] md:px-8">TuneVerse</h1>

            <div className="mx-5 flex items-baseline justify-between gap-4 border-y border-foreground py-2 md:mx-10">
                <span className="font-serif text-lg italic">The Lobby</span>
                <span className="text-sm text-muted-foreground">
                    {isFirstLoad ? "Checking who's on" : rooms.length === 1 ? "1 room on air" : `${rooms.length} rooms on air`}
                </span>
            </div>

            <div className="grid gap-8 px-5 py-8 md:px-10 md:py-10 lg:grid-cols-[minmax(0,1.7fr)_minmax(20rem,1fr)] lg:gap-12">
                <section aria-label="Featured room">
                    {isFirstLoad ? (
                        <div className="skeleton aspect-[4/3] w-full lg:aspect-[16/10]" />
                    ) : cover ? (
                        <button
                            onClick={() => openRoom(cover.id)}
                            disabled={!!joiningId}
                            className="cover group relative block aspect-[4/3] w-full overflow-hidden bg-signal text-left text-signal-foreground lg:aspect-[16/10]"
                        >
                            {cover.nowPlaying?.artwork && (
                                <>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={cover.nowPlaying.artwork} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-[1.04]" />
                                    <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/10" />
                                </>
                            )}
                            <span className={`absolute inset-x-0 bottom-0 block p-5 md:p-8 ${cover.nowPlaying?.artwork ? "text-white" : ""}`}>
                                <span className="block font-serif text-lg italic md:text-xl">The room everyone&apos;s in</span>
                                <span className="mt-1 block break-words font-serif text-5xl leading-[0.95] tracking-tight md:text-7xl xl:text-8xl">{roomTitle(cover)}</span>
                                <span className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-[15px]">
                                    <span>{listeners(cover.users.length)}</span>
                                    {cover.nowPlaying && (
                                        <span className="min-w-0 truncate">
                                            On {SOURCE_LABEL[cover.nowPlaying.source]}: {cover.nowPlaying.title}
                                        </span>
                                    )}
                                    <span className="ml-auto inline-flex items-center gap-2 underline underline-offset-4">
                                        {joiningId === cover.id && <Spinner />}
                                        {joiningId === cover.id ? "Going in" : "Go in"}
                                    </span>
                                </span>
                            </span>
                        </button>
                    ) : (
                        <div className="flex aspect-[4/3] w-full flex-col justify-end bg-muted p-5 md:p-8 lg:aspect-[16/10]">
                            <p className="font-serif text-lg italic text-muted-foreground md:text-xl">
                                {filter === "mine" ? "None of yours are running" : "Quiet in here"}
                            </p>
                            <p className="mt-1 font-serif text-5xl leading-[0.95] tracking-tight md:text-7xl xl:text-8xl">
                                Nobody&apos;s on air.
                            </p>
                            <p className="mt-4 text-[15px] text-muted-foreground">Start a room and this whole page is yours.</p>
                        </div>
                    )}
                </section>

                <div className="flex flex-col gap-10">
                    <form onSubmit={createRoom}>
                        <label htmlFor="room-name" className="block font-serif text-3xl italic md:text-4xl">Start a room</label>
                        <p className="mt-1 text-[15px] text-muted-foreground">Then play anything from YouTube or Spotify.</p>
                        <input
                            id="room-name"
                            value={roomName}
                            maxLength={60}
                            onChange={(e) => setRoomName(e.target.value)}
                            placeholder={`${user?.username}'s room`}
                            className="mt-4 w-full border-b border-foreground bg-transparent py-2.5 text-lg outline-none transition-colors placeholder:text-muted-foreground focus:border-signal"
                        />
                        <Button type="submit" loading={isCreating} loadingText="Setting it up" className="mt-4 w-full">
                            Start the room
                        </Button>
                    </form>

                    <form onSubmit={joinByCode} className="border-t border-border pt-8">
                        <label htmlFor="room-code" className="block font-serif text-3xl italic md:text-4xl">Got a code?</label>
                        <p className="mt-1 text-[15px] text-muted-foreground">Type it in, or paste the invite link.</p>
                        <div className="mt-4 flex items-end gap-4">
                            <input
                                id="room-code"
                                value={roomCode}
                                onChange={(e) => setRoomCode(parseRoomCode(e.target.value))}
                                placeholder="ABC123"
                                autoComplete="off"
                                spellCheck={false}
                                className="min-w-0 flex-1 border-b border-foreground bg-transparent py-2.5 text-lg tracking-[0.2em] outline-none transition-colors placeholder:text-muted-foreground focus:border-signal"
                            />
                            <Button type="submit" variant="outline" disabled={!roomCode} loading={!!joiningId && joiningId === roomCode} loadingText="Joining">
                                Join
                            </Button>
                        </div>
                    </form>
                </div>
            </div>

            <section className="px-5 pb-24 md:px-10">
                <div className="flex items-baseline justify-between gap-4 border-b border-foreground pb-2">
                    <h2 className="font-serif text-3xl italic md:text-4xl">Also on air</h2>
                    <div className="flex gap-4 text-sm" role="group" aria-label="Which rooms to show">
                        {(["all", "mine"] as const).map((option) => (
                            <button
                                key={option}
                                aria-pressed={filter === option}
                                onClick={() => {
                                    if (option === filter) return;
                                    setRooms(null);
                                    setFilter(option);
                                }}
                                className={`border-b-2 pb-0.5 transition-colors ${filter === option ? "border-signal" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                            >
                                {option === "all" ? "Everyone" : "Yours"}
                            </button>
                        ))}
                    </div>
                </div>

                {isFirstLoad ? (
                    <div className="mt-2 space-y-2" aria-hidden="true">
                        {[0, 1, 2].map((i) => <div key={i} className="skeleton h-16" />)}
                    </div>
                ) : others.length === 0 ? (
                    <p className="py-8 font-serif text-xl italic text-muted-foreground">
                        {cover ? "That's the only room going right now." : "Nothing here yet."}
                    </p>
                ) : (
                    <ol>
                        {others.map((room, index) => (
                            <li key={room.id} className="queue-row border-b border-border">
                                <button
                                    onClick={() => openRoom(room.id)}
                                    disabled={!!joiningId}
                                    className="group grid w-full grid-cols-[2.5rem_minmax(0,1fr)_auto] items-baseline gap-3 py-4 text-left md:grid-cols-[4rem_minmax(0,1fr)_minmax(0,1fr)_7rem_4rem] md:gap-6"
                                >
                                    <span className="font-serif text-2xl italic text-muted-foreground">{index + 2}</span>
                                    <span className="truncate font-serif text-2xl transition-[color,transform] duration-300 group-hover:translate-x-1 group-hover:text-signal md:text-3xl">
                                        {roomTitle(room)}
                                    </span>
                                    <span className="col-start-2 row-start-2 truncate text-sm text-muted-foreground md:col-start-auto md:row-start-auto">
                                        {room.nowPlaying ? `On ${SOURCE_LABEL[room.nowPlaying.source]}: ${room.nowPlaying.title}` : "Nothing playing yet"}
                                    </span>
                                    <span className="hidden text-sm text-muted-foreground md:block">{listeners(room.users.length)}</span>
                                    <span className="col-start-3 row-start-1 inline-flex items-center justify-end gap-2 text-sm underline underline-offset-4 md:col-start-auto md:row-start-auto">
                                        {joiningId === room.id ? <Spinner /> : "Join"}
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ol>
                )}
            </section>
        </main>
    );
}

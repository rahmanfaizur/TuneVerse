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
import Artwork from "../../components/poster/Artwork";
import Overprint from "../../components/poster/Overprint";
import PosterMessage from "../../components/poster/PosterMessage";
import SiteHeader from "../../components/poster/SiteHeader";
import Ticket from "../../components/poster/Ticket";
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
            <PosterMessage headline="Lost the signal" text="We can't reach the server. It might be waking up. Give it a moment and try again.">
                <Button onClick={() => window.location.reload()}>Try again</Button>
            </PosterMessage>
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
            <SiteHeader href="/lobby">
                <span className="hidden text-soft sm:inline">{user?.username}</span>
                <button onClick={logout} className="ink-link font-semibold">Sign out</button>
            </SiteHeader>

            <div className="py-8 md:py-10">
                <Overprint text="What's playing" className="text-[clamp(3.5rem,10vw,7.5rem)]" />
                <p className="mt-3 text-lg">Start a room, or jump into one that&apos;s already playing.</p>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(19rem,1fr)]">
                <section aria-label="Featured room" className="min-w-0">
                    {isFirstLoad ? (
                        <div className="skeleton h-full min-h-[18rem]" />
                    ) : cover ? (
                        <Ticket
                            as="button"
                            onClick={() => openRoom(cover.id)}
                            disabled={!!joiningId}
                            className="group h-full min-h-[18rem] w-full bg-pink text-left text-ink"
                            stubWidth="6rem"
                            stubClassName="bg-blue text-paper px-2 transition-colors group-hover:bg-ink"
                            stub={
                                <>
                                    <span className="label">{joiningId === cover.id ? "Going" : "Walk"}</span>
                                    <span className="display text-4xl">{joiningId === cover.id ? <Spinner /> : "In"}</span>
                                    <span className="label mt-3">Code</span>
                                    <span className="font-bold tracking-widest">{cover.id}</span>
                                </>
                            }
                        >
                            <span className="grid h-full gap-5 p-5 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)] md:p-6">
                                <Artwork src={cover.nowPlaying?.artwork} className="aspect-square w-full max-w-44" />
                                <span className="flex min-w-0 flex-col justify-end">
                                    <span className="label">Biggest room right now</span>
                                    <span className="display mt-2 break-words text-5xl md:text-6xl">{roomTitle(cover)}</span>
                                    <span className="mt-3 block truncate text-[15px] font-semibold">
                                        {cover.nowPlaying ? `${cover.nowPlaying.title} · ${SOURCE_LABEL[cover.nowPlaying.source]}` : "Nothing playing yet"}
                                    </span>
                                    <span className="mt-1 block text-[15px]">{listeners(cover.users.length)}</span>
                                </span>
                            </span>
                        </Ticket>
                    ) : (
                        <div className="flex h-full min-h-[18rem] flex-col justify-center bg-wash p-6 md:p-10">
                            <h2 className="display text-4xl text-blue md:text-5xl">
                                {filter === "mine" ? "You've got no rooms going" : "Quiet night so far"}
                            </h2>
                            <p className="mt-2">{filter === "mine" ? "Start one and it shows up here." : "No rooms are live right now. Getting one going takes about ten seconds."}</p>
                            <ol className="mt-6 space-y-3 text-[15px] font-semibold">
                                {["Start a room and give it a name", "Send the link to your friends", "Play anything from YouTube or Spotify"].map((step, i) => (
                                    <li key={step} className="flex items-center gap-3">
                                        <span className="display w-6 text-3xl leading-none text-pink" aria-hidden="true">{i + 1}</span>
                                        {step}
                                    </li>
                                ))}
                            </ol>
                        </div>
                    )}
                </section>

                <div className="flex flex-col gap-6">
                    <form onSubmit={createRoom} className="bg-ink p-5 text-paper md:p-6">
                        <label htmlFor="room-name" className="display block text-3xl">Start a room</label>
                        <p className="mt-1 text-[15px] opacity-85">Then play from YouTube or Spotify.</p>
                        <input
                            id="room-name"
                            value={roomName}
                            maxLength={60}
                            onChange={(e) => setRoomName(e.target.value)}
                            placeholder={`${user?.username}'s room`}
                            className="field mt-4 !border-paper"
                        />
                        <Button type="submit" loading={isCreating} loadingText="Setting it up" className="mt-3 w-full">
                            Start room
                        </Button>
                    </form>

                    <form onSubmit={joinByCode} className="border-2 border-ink p-5 md:p-6">
                        <label htmlFor="room-code" className="display block text-3xl text-ink">Got a code?</label>
                        <p className="mt-1 text-[15px]">Type it in, or paste an invite link.</p>
                        <div className="mt-4 flex gap-2">
                            <input
                                id="room-code"
                                value={roomCode}
                                onChange={(e) => setRoomCode(parseRoomCode(e.target.value))}
                                placeholder="ABC123"
                                autoComplete="off"
                                spellCheck={false}
                                className="field min-w-0 flex-1 font-bold tracking-[0.3em]"
                            />
                            <Button type="submit" variant="outline" disabled={!roomCode} loading={!!joiningId && joiningId === roomCode} loadingText="Joining" className="shrink-0">
                                Join
                            </Button>
                        </div>
                    </form>
                </div>
            </div>

            <section className="pb-20 pt-12">
                <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-ink pb-3">
                    <h2 className="display text-4xl text-blue">More rooms</h2>
                    <div className="flex border-2 border-ink text-sm font-bold" role="group" aria-label="Which rooms to show">
                        {(["all", "mine"] as const).map((option) => (
                            <button
                                key={option}
                                aria-pressed={filter === option}
                                onClick={() => {
                                    if (option === filter) return;
                                    setRooms(null);
                                    setFilter(option);
                                }}
                                className={`px-4 py-1.5 transition-colors ${filter === option ? "bg-ink text-paper" : "text-ink hover:bg-wash"}`}
                            >
                                {option === "all" ? "Everyone" : "Yours"}
                            </button>
                        ))}
                    </div>
                </div>

                {isFirstLoad ? (
                    <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
                        {[0, 1, 2].map((i) => <div key={i} className="skeleton h-24" />)}
                    </div>
                ) : others.length === 0 ? (
                    <p className="mt-4 text-[15px]">
                        {cover ? "That's the only room going right now." : "Nothing here yet."}
                    </p>
                ) : (
                    <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {others.map((room) => (
                            <li key={room.id} className="queue-row">
                                <Ticket
                                    as="button"
                                    onClick={() => openRoom(room.id)}
                                    disabled={!!joiningId}
                                    className="group w-full bg-wash text-left transition-colors hover:bg-[#d3d9ee]"
                                    stubWidth="4.25rem"
                                    stubClassName="bg-pink"
                                    stub={
                                        joiningId === room.id ? <Spinner className="text-xl" /> : (
                                            <>
                                                <span className="display text-3xl leading-none">{room.users.length}</span>
                                                <span className="label mt-1 !text-[0.625rem]">in</span>
                                            </>
                                        )
                                    }
                                >
                                    <span className="flex items-center gap-3 p-3">
                                        <Artwork src={room.nowPlaying?.artwork} className="h-16 w-16 shrink-0" />
                                        <span className="min-w-0 flex-1">
                                            <span className="display block truncate text-2xl">{roomTitle(room)}</span>
                                            <span className="block truncate text-sm text-soft">
                                                {room.nowPlaying ? room.nowPlaying.title : "Nothing playing yet"}
                                            </span>
                                        </span>
                                    </span>
                                </Ticket>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </main>
    );
}

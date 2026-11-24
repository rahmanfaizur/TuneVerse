import { prisma, Prisma } from "@tuneverse/database";
import type { Room } from "@tuneverse/shared";

// Rooms live in memory, so a restart (a deploy, or the free plan waking up) used to wipe
// them. Every change marks the room dirty, and dirty rooms are copied to Postgres a
// moment later. Several quick changes (a vote, a chat line, a skip) become one write.

export interface RoomSnapshot {
    room: Room;
    savedAt: number; // when this copy was taken, to work out how far the song got
    emptySince?: number; // when the last person left, so the cleanup clock survives restarts
}

type LiveRoom = { room: Room; emptySince?: number };

const FLUSH_DELAY_MS = 1000;
const RETRY_DELAY_MS = 5000;

const dirty = new Set<string>();
let timer: NodeJS.Timeout | null = null;
let running: Promise<boolean> | null = null;
let enabled = false;
let readRoom: (roomId: string) => LiveRoom | undefined = () => undefined;

const schedule = (delay: number) => {
    if (!enabled || timer) return;
    timer = setTimeout(() => {
        timer = null;
        void flush();
    }, delay);
};

// Who's in the room is tied to live connections, which don't survive a restart.
// People are added back as their browsers reconnect.
const toSnapshot = ({ room, emptySince }: LiveRoom): RoomSnapshot => ({
    room: { ...room, users: [] },
    savedAt: Date.now(),
    emptySince,
});

const writeDirty = async (): Promise<boolean> => {
    const ids = [...dirty];
    dirty.clear();

    const results = await Promise.allSettled(ids.map((id) => {
        const live = readRoom(id);
        if (!live) return prisma.liveRoom.deleteMany({ where: { id } });
        const data = toSnapshot(live) as unknown as Prisma.InputJsonValue;
        return prisma.liveRoom.upsert({ where: { id }, create: { id, data }, update: { data } });
    }));

    let ok = true;
    results.forEach((result, i) => {
        if (result.status === "rejected") {
            ok = false;
            dirty.add(ids[i]);
            console.error(`Couldn't save room ${ids[i]}:`, result.reason);
        }
    });
    return ok;
};

const flush = (): Promise<boolean> => {
    if (!running) {
        running = writeDirty().finally(() => {
            running = null;
        });
        running.then((ok) => {
            if (dirty.size) schedule(ok ? FLUSH_DELAY_MS : RETRY_DELAY_MS);
        });
    }
    return running;
};

export const RoomPersistence = {
    // Returns the saved rooms. Without a database the server still runs, just without saving.
    async init(getRoom: (roomId: string) => LiveRoom | undefined): Promise<RoomSnapshot[]> {
        readRoom = getRoom;
        if (!process.env.DATABASE_URL) {
            console.warn("No DATABASE_URL, so rooms won't survive a restart.");
            return [];
        }
        try {
            // Matches the LiveRoom model, so `prisma db push` sees nothing to change.
            await prisma.$executeRawUnsafe(`
                CREATE TABLE IF NOT EXISTS "live_rooms" (
                    "id" TEXT NOT NULL PRIMARY KEY,
                    "data" JSONB NOT NULL,
                    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
                )`);
            const rows = await prisma.liveRoom.findMany();
            enabled = true;
            return rows.map((row) => row.data as unknown as RoomSnapshot);
        } catch (err) {
            console.error("Couldn't load saved rooms, so rooms won't survive a restart:", err);
            return [];
        }
    },

    markDirty(roomId: string) {
        if (!enabled) return;
        dirty.add(roomId);
        schedule(FLUSH_DELAY_MS);
    },

    // On shutdown: write everything now, so songs pick up from the right second.
    async flushAll(roomIds: string[]) {
        if (!enabled) return;
        if (timer) clearTimeout(timer);
        timer = null;
        await running;
        roomIds.forEach((id) => dirty.add(id));
        await flush();
    },
};

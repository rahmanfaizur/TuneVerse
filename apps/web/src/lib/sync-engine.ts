import { Socket } from "socket.io-client";
import { EVENTS } from "@tuneverse/shared";

export class SyncEngine {
    private socket: Socket;
    private clockOffset: number = 0;
    private latency: number = 0;

    constructor(socket: Socket) {
        this.socket = socket;
        this.initialize();
    }

    private async initialize() {
        await this.synchronizeClock();
        // Re-sync every 30 seconds
        setInterval(() => this.synchronizeClock(), 30000);
    }

    public async synchronizeClock() {
        const samples = [];
        for (let i = 0; i < 5; i++) {
            const sample = await this.performClockSync();
            samples.push(sample);
            await new Promise((r) => setTimeout(r, 100));
        }

        // Use sample with lowest latency
        const best = samples.reduce((a, b) => (a.latency < b.latency ? a : b));
        this.clockOffset = best.offset;
        this.latency = best.latency;
        console.log(`🕐 Clock synced: offset=${this.clockOffset.toFixed(2)}ms, latency=${this.latency.toFixed(2)}ms`);
    }

    private performClockSync(): Promise<{ offset: number; latency: number }> {
        return new Promise((resolve) => {
            const clientSendTime = Date.now();
            this.socket.emit(EVENTS.SYNC_CLOCK, { clientSendTime });

            const handler = (payload: any) => {
                const { clientSendTime: echoed, serverReceiveTime, serverSendTime } = payload;
                if (echoed !== clientSendTime) return; // Ignore old responses

                const clientReceiveTime = Date.now();
                const roundTripTime = clientReceiveTime - clientSendTime;
                const latency = roundTripTime / 2;

                // Calculate clock offset: Server Time = Client Time + Offset
                // Server Time (at receive) = Client Send + Latency + Offset
                // Offset = Server Receive - (Client Send + Latency)
                // OR: Offset = Server Send - (Client Receive - Latency)
                // Let's use the standard NTP formula:
                // offset = ((serverReceive - clientSend) + (serverSend - clientReceive)) / 2
                const offset = ((serverReceiveTime - clientSendTime) + (serverSendTime - clientReceiveTime)) / 2;

                this.socket.off(EVENTS.SYNC_CLOCK_RESPONSE, handler);
                resolve({ offset, latency });
            };

            this.socket.on(EVENTS.SYNC_CLOCK_RESPONSE, handler);
        });
    }

    public getCorrectedTime(serverTimestamp: number, lastUpdated: number, status: string): number {
        if (status === "PAUSED") return serverTimestamp;

        // Adjust for clock offset
        // Server "Now" = Client "Now" + Offset
        const serverNow = Date.now() + this.clockOffset;
        const timeElapsed = (serverNow - lastUpdated) / 1000;

        return serverTimestamp + timeElapsed;
    }
}

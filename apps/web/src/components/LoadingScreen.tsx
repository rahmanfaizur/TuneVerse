"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Overprint from "./poster/Overprint";

const SLOW_AFTER_MS = 8000;

export default function LoadingScreen({ message = "One moment" }: { message?: string }) {
    const [isSlow, setIsSlow] = useState(false);

    // Free hosting can take a while to wake up, so say so rather than looking frozen.
    useEffect(() => {
        const timer = setTimeout(() => setIsSlow(true), SLOW_AFTER_MS);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div role="status" className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-paper px-6">
            <Overprint as="p" text="TuneVerse" className="text-7xl md:text-8xl" />

            <div className="loader-rule mt-6 h-1 w-48 overflow-hidden bg-wash" />

            <p className="mt-5 text-base font-semibold text-ink">{message}</p>

            <div className={`mt-8 h-10 text-center text-sm text-soft transition-opacity duration-500 ${isSlow ? "opacity-100" : "pointer-events-none opacity-0"}`}>
                <p>Still working on it. The server may be waking up.</p>
                <Link href="/lobby" className="ink-link text-ink">
                    Back to the lobby
                </Link>
            </div>
        </div>
    );
}

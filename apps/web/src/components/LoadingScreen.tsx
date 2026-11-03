"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const SLOW_AFTER_MS = 8000;
const MASTHEAD = "TuneVerse";

export default function LoadingScreen({ message = "One moment" }: { message?: string }) {
    const [isSlow, setIsSlow] = useState(false);

    // Free hosting can take a while to wake up, so say so rather than looking frozen.
    useEffect(() => {
        const timer = setTimeout(() => setIsSlow(true), SLOW_AFTER_MS);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div role="status" className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background px-6">
            <p className="text-5xl font-semibold leading-none tracking-tight md:text-6xl" aria-hidden="true">
                {MASTHEAD.split("").map((letter, i) => (
                    <span key={i} className="inline-block overflow-hidden align-bottom">
                        <span className="masthead-letter inline-block" style={{ animationDelay: `${i * 55}ms` }}>
                            {letter}
                        </span>
                    </span>
                ))}
            </p>

            <div className="loader-rule mt-6 h-0.5 w-40 overflow-hidden rounded-full bg-border" />

            <p className="mt-5 text-base text-muted-foreground">{message}</p>

            <div className={`mt-8 h-10 text-center text-sm text-muted-foreground transition-opacity duration-500 ${isSlow ? "opacity-100" : "pointer-events-none opacity-0"}`}>
                <p>Still working on it. The server may be waking up.</p>
                <Link href="/lobby" className="underline underline-offset-4 transition-colors hover:text-signal">
                    Back to the lobby
                </Link>
            </div>
        </div>
    );
}

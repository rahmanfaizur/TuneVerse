"use client";

import { useEffect } from "react";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-white dark:bg-black text-black dark:text-white transition-colors duration-300">
            <div className="text-center max-w-md space-y-8">
                <div className="space-y-2">
                    <h1 className="text-6xl md:text-8xl font-serif tracking-tighter uppercase leading-none text-red-600 dark:text-red-500">
                        Oops!
                    </h1>
                    <h2 className="text-xl font-serif italic">Something went wrong</h2>
                </div>

                <div className="border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-6">
                    <p className="font-mono text-xs text-red-600 dark:text-red-400 uppercase tracking-wide break-words">
                        {error.message || "An unexpected error occurred."}
                    </p>
                </div>

                <div className="flex gap-4 justify-center">
                    <button
                        onClick={() => reset()}
                        className="bg-black dark:bg-white text-white dark:text-black px-8 py-3 text-xs font-sans font-bold uppercase tracking-[0.2em] hover:opacity-80 transition"
                    >
                        Try Again
                    </button>
                    <button
                        onClick={() => window.location.href = "/lobby"}
                        className="border border-black dark:border-white px-8 py-3 text-xs font-sans font-bold uppercase tracking-[0.2em] hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition"
                    >
                        Return to Lobby
                    </button>
                </div>
            </div>
        </main>
    );
}

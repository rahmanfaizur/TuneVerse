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
        <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-900 text-white">
            <div className="text-center max-w-md">
                <h1 className="text-6xl font-bold mb-4 text-red-500">
                    Oops!
                </h1>
                <h2 className="text-xl font-bold mb-4">Something went wrong</h2>
                <p className="text-gray-400 mb-8 font-mono text-sm bg-gray-800 p-4 rounded-lg overflow-auto">
                    {error.message || "An unexpected error occurred."}
                </p>
                <div className="flex gap-4 justify-center">
                    <button
                        onClick={() => reset()}
                        className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-6 rounded-xl transition"
                    >
                        Try Again
                    </button>
                    <button
                        onClick={() => window.location.href = "/lobby"}
                        className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-xl transition"
                    >
                        Go to Lobby
                    </button>
                </div>
            </div>
        </main>
    );
}

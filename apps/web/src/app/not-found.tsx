"use client";

import Link from "next/link";

export default function NotFound() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-900 text-white">
            <div className="text-center">
                <h1 className="text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 mb-4">
                    404
                </h1>
                <h2 className="text-2xl font-bold mb-4">Page Not Found</h2>
                <p className="text-gray-400 mb-8 max-w-md mx-auto">
                    The frequency you are looking for seems to be out of range.
                    Let's get you back to the signal.
                </p>
                <Link
                    href="/lobby"
                    className="inline-block bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-8 rounded-xl transition shadow-lg shadow-purple-900/20"
                >
                    Return to Lobby
                </Link>
            </div>
        </main>
    );
}

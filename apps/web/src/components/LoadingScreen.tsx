import React from "react";

export default function LoadingScreen({ message = "Loading..." }: { message?: string }) {
    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white dark:bg-black transition-colors duration-300">
            <div className="space-y-6 text-center">
                <div className="relative w-16 h-16 mx-auto">
                    <div className="absolute inset-0 border-t-2 border-black dark:border-white rounded-full animate-spin"></div>
                    <div className="absolute inset-2 border-t-2 border-gray-400 dark:border-gray-600 rounded-full animate-spin-reverse"></div>
                </div>
                <div className="space-y-2">
                    <h2 className="font-serif text-2xl italic text-black dark:text-white animate-pulse">
                        TuneVerse
                    </h2>
                    <p className="font-sans text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                        {message}
                    </p>
                </div>
            </div>
        </div>
    );
}

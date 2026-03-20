import React from "react";
import Link from "next/link";

export default function LoadingScreen({ message = "Loading..." }: { message?: string }) {
    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background transition-colors duration-300">
            <div className="space-y-12 text-center">

                {/* Modern Audio Wave Loader */}
                <div className="flex items-end justify-center gap-1.5 h-16 w-32 mx-auto">
                    {[0, 1, 2, 3, 4].map((i) => (
                        <div
                            key={i}
                            className="w-1.5 bg-accent rounded-t-sm"
                            style={{
                                animation: `audio-wave 1.2s ease-in-out infinite`,
                                animationDelay: `${i * 0.15}s`,
                                height: '20%'
                            }}
                        />
                    ))}
                </div>

                <style dangerouslySetInnerHTML={{
                    __html: `
                    @keyframes audio-wave {
                        0%, 100% { height: 20%; }
                        50% { height: 100%; }
                    }
                `}} />

                <div className="space-y-6">
                    <div className="space-y-4">
                        <h2 className="font-serif text-3xl italic text-foreground tracking-tighter animate-pulse">
                            TuneVerse
                        </h2>
                        <p className="font-sans text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                            {message}
                        </p>
                    </div>
                    <Link
                        href="/lobby"
                        className="inline-block text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors border-b border-transparent hover:border-foreground pb-1"
                    >
                        Go Home
                    </Link>
                </div>
            </div>
        </div>
    );
}

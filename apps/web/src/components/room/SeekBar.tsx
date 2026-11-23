"use client";

import { useState } from "react";

const formatTime = (seconds: number) => {
    const s = Math.max(0, Math.floor(seconds));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

interface SeekBarProps {
    position: number; // seconds into the song, as the room hears it
    duration: number; // seconds, 0 while unknown
    canSeek: boolean;
    onSeek: (seconds: number) => void;
}

// The song's progress, for everyone. The host and DJs can drag it; the jump only goes
// out when they let go, so the room doesn't skip about while they hunt for a spot.
export default function SeekBar({ position, duration, canSeek, onSeek }: SeekBarProps) {
    const [dragging, setDragging] = useState<number | null>(null);
    const shown = Math.min(dragging ?? position, duration || Infinity);
    const percent = duration ? Math.min(100, (shown / duration) * 100) : 0;

    const commit = () => {
        if (dragging === null) return;
        onSeek(dragging);
        setDragging(null);
    };

    return (
        <div className="flex items-center gap-3 text-xs tabular-nums">
            <span className="w-10 text-soft">{formatTime(shown)}</span>
            <div className="group relative h-5 flex-1">
                <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 bg-wash">
                    <div className="h-full bg-pink" style={{ width: `${percent}%` }} />
                </div>
                {canSeek && duration > 0 && (
                    <>
                        <span
                            aria-hidden
                            className="pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 border-2 border-ink bg-paper transition-transform group-hover:scale-125 motion-reduce:transition-none"
                            style={{ left: `${percent}%` }}
                        />
                        <input
                            type="range"
                            min={0}
                            max={Math.floor(duration)}
                            step={1}
                            value={Math.floor(shown)}
                            aria-label="Seek"
                            aria-valuetext={`${formatTime(shown)} of ${formatTime(duration)}`}
                            onChange={(e) => setDragging(Number(e.target.value))}
                            onPointerUp={commit}
                            onKeyUp={commit}
                            onBlur={commit}
                            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                        />
                    </>
                )}
            </div>
            <span className="w-10 text-right text-soft">{duration ? formatTime(duration) : "-:--"}</span>
        </div>
    );
}

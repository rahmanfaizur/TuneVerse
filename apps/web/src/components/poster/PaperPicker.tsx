"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { PAPERS } from "./papers";

// All four papers in one box, light and dark taking turns so it reads as a mix.
const SHUFFLE_ORDER = ["light", "dark", "blush", "black"];
const SHUFFLE_SWATCH = `conic-gradient(${SHUFFLE_ORDER.map((id, i) => `${PAPERS.find((paper) => paper.id === id)!.swatch} 0 ${(i + 1) * 25}%`).join(", ")})`;

const SWATCH =
    "relative h-5 w-5 border-2 border-ink transition-[translate,rotate,box-shadow] duration-200 ease-out " +
    "hover:-translate-y-0.5 hover:shadow-[2px_2px_0_0_var(--color-pink)] focus-visible:-translate-y-0.5 " +
    "motion-reduce:transition-none";

// A little printed tag under the box, on hover or keyboard focus.
function Tag({ text, alignEnd }: { text: string; alignEnd?: boolean }) {
    return (
        <span
            aria-hidden
            className={`pointer-events-none absolute top-full z-20 mt-3 whitespace-nowrap bg-ink px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-paper opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-has-[:focus-visible]:opacity-100 ${alignEnd ? "right-0" : "left-1/2 -translate-x-1/2"}`}
        >
            {text}
        </span>
    );
}

// A row of paper samples, like a printer's swatch book. The first one shuffles to a random
// paper; the paper in use sits raised with a pink tick. New visitors follow their device.
export default function PaperPicker() {
    const { resolvedTheme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [spins, setSpins] = useState(0);

    // The saved paper is only known in the browser, so draw empty slots until then.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => setMounted(true), []);

    const current = mounted ? resolvedTheme : undefined;
    const currentName = PAPERS.find((paper) => paper.id === current)?.name;

    const shuffle = () => {
        const others = PAPERS.filter((paper) => paper.id !== current);
        setTheme(others[Math.floor(Math.random() * others.length)].id);
        setSpins((n) => n + 1);
    };

    return (
        <div role="group" aria-label="Paper" className="flex items-end gap-1.5">
            <span className="group relative">
                <button
                    type="button"
                    aria-label="Shuffle paper"
                    onClick={shuffle}
                    className={`${SWATCH} hover:-rotate-12`}
                    style={{ background: SHUFFLE_SWATCH, rotate: `${spins * 180}deg` }}
                />
                <Tag text={spins && currentName ? `Shuffled: ${currentName}` : "Shuffle"} />
            </span>

            {PAPERS.map((paper, i) => {
                const picked = current === paper.id;
                return (
                    <span key={paper.id} className="group relative">
                        <button
                            type="button"
                            aria-label={paper.name}
                            aria-pressed={picked}
                            onClick={() => setTheme(paper.id)}
                            className={`${SWATCH} hover:-rotate-6 ${picked ? "-translate-y-1" : ""} after:absolute after:inset-x-0 after:-bottom-[7px] after:h-[3px] ${picked ? "after:bg-pink" : "after:bg-transparent"}`}
                            style={{ background: paper.swatch }}
                        />
                        <Tag text={paper.name} alignEnd={i === PAPERS.length - 1} />
                    </span>
                );
            })}
            <span className="sr-only" aria-live="polite">{spins && currentName ? `Paper: ${currentName}` : ""}</span>
        </div>
    );
}

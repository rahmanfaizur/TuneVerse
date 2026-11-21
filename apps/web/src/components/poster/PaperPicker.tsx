"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { PAPERS } from "./papers";

const CHOICES = [
    // Split swatch: day paper top-left, night paper bottom-right.
    { id: "system", name: "Auto (follows your device)", swatch: "linear-gradient(135deg, #f2f3f5 50%, #0e1647 50%)" },
    ...PAPERS.map((paper) => ({ id: paper.id, name: paper.name, swatch: paper.swatch })),
];

// A row of paper samples, like a printer's swatch book. The picked one sits raised with a pink tick.
export default function PaperPicker() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    // The saved paper is only known in the browser, so draw empty slots until then.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => setMounted(true), []);

    return (
        <div role="group" aria-label="Paper" className="flex items-end gap-1.5">
            {CHOICES.map((choice) => {
                const picked = mounted && theme === choice.id;
                return (
                    <button
                        key={choice.id}
                        type="button"
                        title={choice.name}
                        aria-label={choice.name}
                        aria-pressed={picked}
                        onClick={() => setTheme(choice.id)}
                        className={`relative h-5 w-5 border-2 border-ink transition-transform hover:-translate-y-0.5 ${picked ? "-translate-y-1" : ""} after:absolute after:inset-x-0 after:-bottom-[7px] after:h-[3px] ${picked ? "after:bg-pink" : "after:bg-transparent"}`}
                        style={{ background: choice.swatch }}
                    />
                );
            })}
        </div>
    );
}

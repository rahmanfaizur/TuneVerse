"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const START_EVENT = "tuneverse:navigation-start";

// For navigation that happens through router.push rather than a link.
export const startNavigationProgress = () => {
    window.dispatchEvent(new Event(START_EVENT));
};

type Phase = "idle" | "running" | "finishing";

export default function NavigationProgress() {
    const pathname = usePathname();
    const [phase, setPhase] = useState<Phase>("idle");
    const [lastPathname, setLastPathname] = useState(pathname);

    // When the page actually changes, finish the bar. Done while rendering, so there's no extra pass.
    if (pathname !== lastPathname) {
        setLastPathname(pathname);
        if (phase === "running") setPhase("finishing");
    }

    useEffect(() => {
        const start = () => setPhase("running");

        const handleClick = (e: MouseEvent) => {
            if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

            const link = (e.target as Element).closest?.("a");
            if (!link || link.target === "_blank" || link.origin !== window.location.origin) return;
            if (link.pathname === window.location.pathname) return;

            start();
        };

        document.addEventListener("click", handleClick);
        window.addEventListener(START_EVENT, start);
        return () => {
            document.removeEventListener("click", handleClick);
            window.removeEventListener(START_EVENT, start);
        };
    }, []);

    useEffect(() => {
        if (phase !== "finishing") return;
        const timer = setTimeout(() => setPhase("idle"), 450);
        return () => clearTimeout(timer);
    }, [phase]);

    if (phase === "idle") return null;

    return (
        <div
            aria-hidden="true"
            className={`fixed inset-x-0 top-0 z-[200] h-1 origin-left bg-pink ${phase === "running" ? "nav-progress-running" : "nav-progress-finishing"}`}
        />
    );
}

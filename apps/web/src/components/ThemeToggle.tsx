"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return (
        <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="fixed bottom-5 right-5 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-md transition-colors hover:bg-muted"
            aria-label="Switch between light and dark"
        >
            {theme === "dark" ? "☀" : "☾"}
        </button>
    );
}

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
            className="fixed bottom-8 right-8 w-12 h-12 rounded-full border border-border bg-background text-foreground flex items-center justify-center hover:scale-110 hover:bg-accent hover:text-accent-foreground transition-all duration-300 z-50 shadow-xl font-serif text-xl"
            aria-label="Toggle Theme"
        >
            {theme === "dark" ? "☀" : "☾"}
        </button>
    );
}

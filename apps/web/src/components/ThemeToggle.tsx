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
            className="fixed bottom-8 right-8 w-10 h-10 rounded-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-black text-black dark:text-white flex items-center justify-center hover:scale-110 transition-transform z-50 shadow-xl font-serif text-lg"
            aria-label="Toggle Theme"
        >
            {theme === "dark" ? "☀" : "☾"}
        </button>
    );
}

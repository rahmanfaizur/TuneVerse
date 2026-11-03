"use client";

import { usePathname } from "next/navigation";

export default function Template({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return (
        <div key={pathname} className="animate-page-enter relative h-full w-full bg-background text-foreground">
            {children}
        </div>
    );
}

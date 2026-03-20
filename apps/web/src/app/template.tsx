"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function Template({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, [pathname]);

    return (
        <div key={pathname} className="animate-page-enter relative w-full h-full text-foreground bg-background">
            {children}
        </div>
    );
}

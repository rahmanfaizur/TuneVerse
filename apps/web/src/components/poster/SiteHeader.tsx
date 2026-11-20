import { ReactNode } from "react";
import Link from "next/link";

// Wordmark on the left, whatever the page needs on the right, a thick ink rule under it.
export default function SiteHeader({ children, href = "/" }: { children?: ReactNode; href?: string }) {
    return (
        <header className="flex items-center justify-between gap-4 border-b-2 border-rule py-4">
            <Link href={href} className="display text-[1.75rem] leading-none text-ink transition-colors hover:text-blue">
                TuneVerse
            </Link>
            {children && <div className="flex items-center gap-5 text-[15px]">{children}</div>}
        </header>
    );
}

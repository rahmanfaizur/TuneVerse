import { ReactNode } from "react";
import Overprint from "./Overprint";
import SiteHeader from "./SiteHeader";

interface PosterMessageProps {
    headline: string;
    text: string;
    /** Small wide label above the headline, e.g. "404". */
    label?: string;
    children?: ReactNode;
}

// One full-page message, printed like a poster: errors, 404, waiting at the door.
export default function PosterMessage({ headline, text, label, children }: PosterMessageProps) {
    return (
        <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 md:px-8">
            <SiteHeader />
            <div className="flex flex-1 flex-col justify-center py-14">
                {label && <p className="label mb-3 text-soft">{label}</p>}
                <Overprint text={headline} className="max-w-4xl text-[clamp(3.5rem,11vw,8rem)]" />
                <p className="mt-5 max-w-md text-lg leading-snug">{text}</p>
                {children && <div className="mt-7 flex flex-wrap items-center gap-5">{children}</div>}
            </div>
        </main>
    );
}

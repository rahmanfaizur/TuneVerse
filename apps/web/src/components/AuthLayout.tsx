import { ReactNode } from "react";
import Link from "next/link";

interface AuthLayoutProps {
    headline: ReactNode;
    caption: string;
    children: ReactNode;
}

export default function AuthLayout({ headline, caption, children }: AuthLayoutProps) {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center px-5 py-10">
            <div className="w-full max-w-md">
                <Link href="/" className="block text-center text-xl font-semibold tracking-tight transition-colors hover:text-signal">TuneVerse</Link>
                <div className="mt-6 text-center">
                    <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{headline}</h1>
                    <p className="mt-1.5 text-muted-foreground">{caption}</p>
                </div>
                <div className="mt-6">{children}</div>
            </div>
        </main>
    );
}

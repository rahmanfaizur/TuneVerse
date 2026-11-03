import { ReactNode } from "react";
import Link from "next/link";

interface AuthLayoutProps {
    headline: ReactNode;
    caption: string;
    children: ReactNode;
}

export default function AuthLayout({ headline, caption, children }: AuthLayoutProps) {
    return (
        <main className="grid min-h-screen lg:grid-cols-[1.15fr_1fr]">
            <section className="flex flex-col justify-between bg-signal p-6 text-signal-foreground md:p-10 lg:min-h-screen">
                <Link href="/" className="font-serif text-2xl tracking-tight transition-opacity hover:opacity-70">TuneVerse</Link>
                <div className="mt-12 lg:mt-0">
                    <h1 className="font-serif text-6xl leading-[0.9] tracking-tight md:text-8xl xl:text-[9.5rem]">{headline}</h1>
                    <p className="mt-5 max-w-sm font-serif text-lg italic md:text-xl">{caption}</p>
                </div>
            </section>

            <section className="flex items-center justify-center px-6 py-12 md:px-12">
                <div className="w-full max-w-md">{children}</div>
            </section>
        </main>
    );
}

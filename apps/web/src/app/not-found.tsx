import Link from "next/link";

export default function NotFound() {
    return (
        <main className="flex min-h-screen flex-col justify-center px-6 md:px-16">
            <p className="font-serif text-xl italic text-muted-foreground">Page 404</p>
            <h1 className="mt-2 font-serif text-6xl leading-none tracking-tight md:text-9xl">Torn out<br /><em>of this issue.</em></h1>
            <p className="mt-6 max-w-md text-lg text-muted-foreground">This page doesn&apos;t exist. It may have moved, or the link might be off.</p>
            <Link href="/lobby" className="mt-8 self-start bg-accent px-7 py-3.5 text-sm tracking-wide text-accent-foreground transition-colors hover:bg-signal hover:text-signal-foreground">
                Back to the lobby
            </Link>
        </main>
    );
}

import Link from "next/link";

export default function NotFound() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
            <p className="text-sm font-medium text-signal">404</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight md:text-5xl">This page <em>doesn&apos;t</em> exist</h1>
            <p className="mt-3 max-w-md text-lg text-muted-foreground">It may have moved, or the link might be off.</p>
            <Link href="/lobby" className="mt-6 rounded-full bg-signal px-6 py-3 text-[15px] font-medium text-signal-foreground transition-opacity hover:opacity-90">
                Back to the lobby
            </Link>
        </main>
    );
}

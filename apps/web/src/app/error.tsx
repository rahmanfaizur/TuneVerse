"use client";

import { useEffect } from "react";
import Link from "next/link";
import Button from "../components/Button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <main className="flex min-h-screen flex-col justify-center px-6 md:px-16">
            <h1 className="font-serif text-6xl italic leading-none tracking-tight md:text-9xl">Well, that broke.</h1>
            <p className="mt-6 max-w-md text-lg text-muted-foreground">Something went wrong on our side. Trying again usually fixes it.</p>
            <div className="mt-8 flex flex-wrap items-center gap-6">
                <Button onClick={reset}>Try again</Button>
                <Link href="/lobby" className="text-sm underline underline-offset-4 transition-colors hover:text-signal">Back to the lobby</Link>
            </div>
        </main>
    );
}

"use client";

import { useEffect } from "react";
import Link from "next/link";
import Button from "../components/Button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
            <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">Something <em>broke</em></h1>
            <p className="mt-3 max-w-md text-lg text-muted-foreground">It&apos;s on our side. Trying again usually fixes it.</p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-5">
                <Button onClick={reset}>Try again</Button>
                <Link href="/lobby" className="text-[15px] underline-offset-4 hover:text-signal hover:underline">Back to the lobby</Link>
            </div>
        </main>
    );
}

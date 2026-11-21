"use client";

import { useEffect } from "react";
import Link from "next/link";
import Button from "../components/Button";
import PosterMessage from "../components/poster/PosterMessage";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <PosterMessage headline="Something broke" text="It's on our side. Trying again usually fixes it.">
            <Button onClick={reset}>Try again</Button>
            <Link href="/lobby" className="ink-link text-[15px] font-semibold">Back to the lobby</Link>
        </PosterMessage>
    );
}

import Link from "next/link";
import { buttonClass } from "../components/Button";
import PosterMessage from "../components/poster/PosterMessage";

export default function NotFound() {
    return (
        <PosterMessage label="404" headline="Wrong venue" text="This page doesn't exist. It may have moved, or the link might be off.">
            <Link href="/lobby" className={buttonClass("primary")}>Back to the lobby</Link>
        </PosterMessage>
    );
}

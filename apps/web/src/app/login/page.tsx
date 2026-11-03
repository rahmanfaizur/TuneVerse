"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AuthLayout from "../../components/AuthLayout";
import Button from "../../components/Button";
import LoadingScreen from "../../components/LoadingScreen";
import TextField from "../../components/TextField";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import { postAuth, safeCallback } from "../../lib/auth-api";

function LoginForm() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [guestName, setGuestName] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState<"login" | "guest" | null>(null);

    const { login } = useAuth();
    const { login: socketLogin } = useSocket();
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = safeCallback(searchParams.get("callbackUrl"));

    const signIn = async (kind: "login" | "guest", body: Record<string, string>) => {
        setError("");
        setBusy(kind);
        try {
            const data = await postAuth(kind, body);
            login(data.token, data.user);
            socketLogin(data.user.username);
            router.push(callbackUrl);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
            setBusy(null);
        }
    };

    return (
        <AuthLayout headline={<>Back<br /><em>again.</em></>} caption="Your friends have probably started without you.">
            <form onSubmit={(e: FormEvent) => { e.preventDefault(); signIn("login", { email, password }); }} className="space-y-6">
                <TextField id="email" label="Email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <TextField id="password" label="Password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
                {error && <p role="alert" className="text-[15px] text-signal">{error}</p>}
                <Button type="submit" loading={busy === "login"} loadingText="Signing in" disabled={!!busy} className="w-full">Sign in</Button>
            </form>

            <p className="mt-5 text-[15px] text-muted-foreground">
                New here?{" "}
                <Link href={`/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="text-foreground underline underline-offset-4 transition-colors hover:text-signal">
                    Create an account
                </Link>
            </p>

            <form onSubmit={(e: FormEvent) => { e.preventDefault(); signIn("guest", { username: guestName.trim() }); }} className="mt-10 border-t border-border pt-8">
                <h2 className="font-serif text-3xl italic">Just here to listen?</h2>
                <p className="mt-1 text-[15px] text-muted-foreground">No account needed. Pick a name or we&apos;ll make one up.</p>
                <div className="mt-4 flex items-end gap-4">
                    <div className="min-w-0 flex-1">
                        <TextField id="guest-name" label="Your name" maxLength={30} value={guestName} onChange={(e) => setGuestName(e.target.value)} />
                    </div>
                    <Button type="submit" variant="outline" loading={busy === "guest"} loadingText="Joining" disabled={!!busy} className="shrink-0">Join as guest</Button>
                </div>
            </form>
        </AuthLayout>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<LoadingScreen />}>
            <LoginForm />
        </Suspense>
    );
}

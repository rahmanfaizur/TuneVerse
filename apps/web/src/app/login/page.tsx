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
        <AuthLayout headline={<>Welcome <em>back</em></>} caption="Your friends have probably started without you.">
            <form onSubmit={(e: FormEvent) => { e.preventDefault(); signIn("login", { email, password }); }} className="space-y-4 rounded-3xl border border-border p-6">
                <TextField id="email" label="Email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <TextField id="password" label="Password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
                {error && <p role="alert" className="text-[15px] font-medium text-red-600 dark:text-red-400">{error}</p>}
                <Button type="submit" loading={busy === "login"} loadingText="Signing in" disabled={!!busy} className="w-full">Sign in</Button>
            </form>

            <p className="mt-4 text-center text-[15px] text-muted-foreground">
                New here?{" "}
                <Link href={`/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="font-medium text-signal underline-offset-4 hover:underline">
                    Create an account
                </Link>
            </p>

            <form onSubmit={(e: FormEvent) => { e.preventDefault(); signIn("guest", { username: guestName.trim() }); }} className="mt-6 rounded-3xl bg-muted p-6">
                <h2 className="text-lg font-semibold tracking-tight">Just here to listen?</h2>
                <p className="text-[15px] text-muted-foreground">No account needed. Pick a name, or we&apos;ll make one up.</p>
                <div className="mt-3 flex gap-2">
                    <input
                        aria-label="Your name"
                        placeholder="Your name"
                        maxLength={30}
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        className="field min-w-0 flex-1 !bg-background"
                    />
                    <Button type="submit" loading={busy === "guest"} loadingText="Joining" disabled={!!busy} className="shrink-0">Join</Button>
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

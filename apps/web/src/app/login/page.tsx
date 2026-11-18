"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AuthLayout from "../../components/AuthLayout";
import FormError from "../../components/FormError";
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
        <AuthLayout
            headline="Welcome back"
            caption="Your friends have probably started without you."
            after={
                <>
                    <p className="mt-4 text-[15px]">
                        New here?{" "}
                        <Link href={`/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="ink-link font-semibold">
                            Create an account
                        </Link>
                    </p>

                    <form onSubmit={(e: FormEvent) => { e.preventDefault(); signIn("guest", { username: guestName.trim() }); }} className="mt-6 bg-ink p-5 text-paper md:p-6">
                        <h2 className="display text-3xl">Just here to listen?</h2>
                        <p className="mt-1 text-[15px] opacity-85">No account needed. Pick a name, or we&apos;ll make one up.</p>
                        <div className="mt-4 flex gap-2">
                            <input
                                aria-label="Your name"
                                placeholder="Your name"
                                maxLength={30}
                                value={guestName}
                                onChange={(e) => setGuestName(e.target.value)}
                                className="field min-w-0 flex-1 !border-paper"
                            />
                            <Button type="submit" loading={busy === "guest"} loadingText="Joining" disabled={!!busy} className="shrink-0">Join</Button>
                        </div>
                    </form>
                </>
            }
        >
            <form onSubmit={(e: FormEvent) => { e.preventDefault(); signIn("login", { email, password }); }} className="space-y-4">
                <TextField id="email" label="Email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <TextField id="password" label="Password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
                {error && <FormError message={error} />}
                <Button type="submit" loading={busy === "login"} loadingText="Signing in" disabled={!!busy} className="w-full">Sign in</Button>
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

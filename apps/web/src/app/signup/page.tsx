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

function SignupForm() {
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { login } = useAuth();
    const { login: socketLogin } = useSocket();
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = safeCallback(searchParams.get("callbackUrl"));

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError("");
        setIsSubmitting(true);

        try {
            const data = await postAuth("signup", { username: username.trim(), email, password });
            login(data.token, data.user);
            socketLogin(data.user.username);
            router.push(callbackUrl);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
            setIsSubmitting(false);
        }
    };

    return (
        <AuthLayout headline={<>Pull up <em>a chair</em></>} caption="Same song, same second, everyone in the room.">
            <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-border p-6">
                <TextField id="username" label="Username" required maxLength={30} autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} />
                <TextField id="email" label="Email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <TextField id="password" label="Password" type="password" required minLength={8} maxLength={72} autoComplete="new-password" hint="At least 8 characters." value={password} onChange={(e) => setPassword(e.target.value)} />
                {error && <p role="alert" className="text-[15px] font-medium text-red-600 dark:text-red-400">{error}</p>}
                <Button type="submit" loading={isSubmitting} loadingText="Creating your account" className="w-full">Create account</Button>
            </form>

            <p className="mt-4 text-center text-[15px] text-muted-foreground">
                Already have one?{" "}
                <Link href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="font-medium text-signal underline-offset-4 hover:underline">
                    Sign in
                </Link>
                {" "}or join as a guest from there.
            </p>
        </AuthLayout>
    );
}

export default function SignupPage() {
    return (
        <Suspense fallback={<LoadingScreen />}>
            <SignupForm />
        </Suspense>
    );
}

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
        <AuthLayout
            headline="Pull up a chair"
            caption="Same song, same second, everyone in the room."
            after={
                <p className="mt-4 text-[15px]">
                    Already have one?{" "}
                    <Link href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="ink-link font-semibold">
                        Sign in
                    </Link>
                    {" "}or{" "}
                    <Link href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}#guest`} className="ink-link font-semibold">
                        join as a guest
                    </Link>
                    .
                </p>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <TextField id="username" label="Username" required maxLength={30} autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} />
                <TextField id="email" label="Email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <TextField id="password" label="Password" type="password" required minLength={8} maxLength={72} autoComplete="new-password" hint="At least 8 characters." value={password} onChange={(e) => setPassword(e.target.value)} />
                {error && <FormError message={error} />}
                <Button type="submit" loading={isSubmitting} loadingText="Creating your account" className="w-full">Create account</Button>
            </form>
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

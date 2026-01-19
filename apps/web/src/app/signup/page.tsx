"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import LoadingScreen from "../../components/LoadingScreen";
import { useAuth } from "../../context/AuthContext";

function SignupForm() {
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const { login } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get("callbackUrl") || "/lobby";

    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/signup`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Signup failed");
            }

            login(data.token, data.user);
            router.push(callbackUrl); // Redirect to callbackUrl
        } catch (err: any) {
            setError(err.message);
            setIsLoading(false);
        }
    };

    if (isLoading) return <LoadingScreen message="Creating account..." />;

    return (
        <div className="flex min-h-screen w-full bg-white dark:bg-black transition-colors duration-300">
            {/* Left: Editorial Image */}
            <div className="hidden lg:block w-1/2 bg-gray-100 dark:bg-gray-900 relative overflow-hidden">
                <div className="absolute inset-0 bg-black/10 z-10" />
                {/* Placeholder for editorial image */}
                <div className="w-full h-full bg-[url('https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=2069&auto=format&fit=crop')] bg-cover bg-center opacity-80 dark:opacity-60" />
                <div className="absolute bottom-12 left-12 z-20 text-white">
                    <h2 className="font-serif text-5xl mb-4">TuneVerse</h2>
                    <p className="font-sans text-sm tracking-widest uppercase">Join the movement</p>
                </div>
            </div>

            {/* Right: Minimalist Form */}
            <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8 lg:p-24">
                <div className="w-full max-w-md space-y-12">

                    <div className="text-center space-y-4">
                        <h1 className="font-serif text-4xl text-black dark:text-white">Create Account</h1>
                        <p className="font-sans text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400">
                            Begin your journey
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="space-y-6">
                            <div className="group">
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2 group-focus-within:text-black dark:group-focus-within:text-white transition-colors">
                                    Username
                                </label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full py-2 border-b border-gray-200 dark:border-gray-800 focus:border-black dark:focus:border-white outline-none font-serif text-xl transition-colors bg-transparent text-black dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-700"
                                    placeholder="Maverick"
                                />
                            </div>

                            <div className="group">
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2 group-focus-within:text-black dark:group-focus-within:text-white transition-colors">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full py-2 border-b border-gray-200 dark:border-gray-800 focus:border-black dark:focus:border-white outline-none font-serif text-xl transition-colors bg-transparent text-black dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-700"
                                    placeholder="name@example.com"
                                />
                            </div>

                            <div className="group">
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2 group-focus-within:text-black dark:group-focus-within:text-white transition-colors">
                                    Password
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full py-2 border-b border-gray-200 dark:border-gray-800 focus:border-black dark:focus:border-white outline-none font-serif text-xl transition-colors bg-transparent text-black dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-700"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        {error && (
                            <p className="text-red-500 text-xs font-mono text-center">{error}</p>
                        )}

                        <button
                            type="submit"
                            className="w-full bg-black dark:bg-white text-white dark:text-black py-4 text-xs font-bold uppercase tracking-[0.2em] hover:opacity-80 transition-opacity"
                        >
                            Create Account
                        </button>
                    </form>

                    <div className="space-y-6 text-center">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-100 dark:border-gray-800"></div>
                            </div>
                            <div className="relative flex justify-center text-xs uppercase tracking-widest">
                                <span className="px-4 bg-white dark:bg-black text-gray-400 dark:text-gray-600">Or</span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <Link
                                href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                                className="block w-full py-3 border border-black dark:border-white text-black dark:text-white text-xs font-bold uppercase tracking-[0.2em] hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
                            >
                                Sign In
                            </Link>

                            <button
                                onClick={async () => {
                                    setIsLoading(true);
                                    try {
                                        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/guest`, {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({}),
                                        });
                                        const data = await res.json();
                                        if (!res.ok) throw new Error(data.error || "Guest login failed");
                                        login(data.token, data.user);
                                        router.push(callbackUrl); // Redirect to callbackUrl
                                    } catch (err: any) {
                                        setError(err.message);
                                        setIsLoading(false);
                                    }
                                }}
                                className="block w-full text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                            >
                                Join as Guest
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

export default function SignupPage() {
    return (
        <Suspense fallback={<LoadingScreen message="Loading..." />}>
            <SignupForm />
        </Suspense>
    );
}

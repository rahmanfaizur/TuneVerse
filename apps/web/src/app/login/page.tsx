"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import LoadingScreen from "../../components/LoadingScreen";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";


//! Images
// https://unsplash.com/photos/lighted-red-text-signage-1oKxSKSOowE
// https://unsplash.com/photos/vintage-tape-cassette-recorder-on-colour-background-flat-lay-top-view-retro-technology-BxlyCaIjL58
// https://unsplash.com/photos/purple-vinyl-record-on-black-and-white-table-QzpgqElvSiA

function LoginForm() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [guestName, setGuestName] = useState(""); // New state for guest name
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
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
            const res = await fetch(`${apiUrl}/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Login failed");
            }

            login(data.token, data.user);
            router.push(callbackUrl); // Redirect to callbackUrl
        } catch (err: any) {
            setError(err.message);
            setIsLoading(false);
        }
    };

    const { login: socketLogin } = useSocket(); // Get socket login function

    const handleGuestLogin = async () => {
        setIsLoading(true);
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
            const res = await fetch(`${apiUrl}/api/auth/guest`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: guestName }), // Send guestName
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Guest login failed");

            login(data.token, data.user);
            socketLogin(data.user.username); // <--- Connect socket immediately
            router.push(callbackUrl); // Redirect to callbackUrl
        } catch (err: any) {
            setError(err.message);
            setIsLoading(false);
        }
    };

    if (isLoading) return <LoadingScreen message="Signing in..." />;

    return (
        <div className="flex min-h-screen w-full bg-background transition-colors duration-300">
            {/* Left: Editorial Image */}
            <div className="hidden lg:block w-1/2 bg-muted relative overflow-hidden">
                <div className="absolute inset-0 bg-black/10 z-10" />
                {/* Placeholder for editorial image - using a nice gradient/pattern for now */}
                <div className="w-full h-full bg-[url('https://unsplash.com/photos/lighted-red-text-signage-1oKxSKSOowE?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-80 dark:opacity-60" />
                <div className="absolute bottom-12 left-12 z-20 text-white">
                    <h2 className="font-serif text-5xl mb-4">TuneVerse</h2>
                    <p className="font-sans text-sm tracking-widest uppercase">The sound of style</p>
                </div>
            </div>

            {/* Right: Minimalist Form */}
            <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 md:p-12 lg:p-24">
                <div className="w-full max-w-md space-y-12">

                    <div className="text-center space-y-4">
                        <h1 className="font-serif text-4xl text-foreground">Sign in</h1>
                        <p className="font-sans text-xs uppercase tracking-widest text-muted-foreground">
                            Welcome back to the community
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="space-y-6">
                            <div className="group">
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 group-focus-within:text-foreground transition-colors">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full py-2 border-b border-border focus:border-accent outline-none font-serif text-xl transition-colors bg-transparent text-foreground placeholder:text-muted-foreground"
                                    placeholder="name@example.com"
                                />
                            </div>

                            <div className="group">
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 group-focus-within:text-foreground transition-colors">
                                    Password
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full py-2 border-b border-border focus:border-accent outline-none font-serif text-xl transition-colors bg-transparent text-foreground placeholder:text-muted-foreground"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        {error && (
                            <p className="text-red-500 text-xs font-mono text-center">{error}</p>
                        )}

                        <button
                            type="submit"
                            className="w-full bg-accent text-accent-foreground py-4 text-xs font-bold uppercase tracking-[0.2em] hover:opacity-80 transition-opacity"
                        >
                            Continue
                        </button>
                    </form>

                    <div className="space-y-6 text-center">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-border"></div>
                            </div>
                            <div className="relative flex justify-center text-xs uppercase tracking-widest">
                                <span className="px-4 bg-background text-muted-foreground">Or</span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <Link
                                href={`/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                                className="block w-full py-3 border border-accent text-foreground text-xs font-bold uppercase tracking-[0.2em] hover:bg-accent hover:text-accent-foreground transition-colors"
                            >
                                Create an Account
                            </Link>

                            {/* Guest Login Section */}
                            <div className="pt-4 space-y-4">
                                <div className="group text-left">
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 group-focus-within:text-foreground transition-colors">
                                        Guest Username (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={guestName}
                                        onChange={(e) => setGuestName(e.target.value)}
                                        className="w-full py-2 border-b border-border focus:border-accent outline-none font-serif text-xl transition-colors bg-transparent text-foreground placeholder:text-muted-foreground"
                                        placeholder="Guest"
                                    />
                                </div>
                                <button
                                    onClick={handleGuestLogin}
                                    className="block w-full text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    Join as Guest
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<LoadingScreen message="Loading..." />}>
            <LoginForm />
        </Suspense>
    );
}

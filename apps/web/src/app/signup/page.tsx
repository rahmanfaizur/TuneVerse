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
        <div className="min-h-screen w-full bg-background text-foreground transition-colors duration-300 flex flex-col relative overflow-hidden selection:bg-accent selection:text-accent-foreground">
            <nav className="w-full p-6 md:p-12 flex justify-between items-center z-10 absolute top-0 left-0">
                <Link href="/" className="font-serif text-2xl tracking-tighter uppercase hover:opacity-50 transition-opacity">TuneVerse</Link>
                <div className="font-sans text-xs uppercase tracking-[0.2em] text-muted-foreground">Sign Up</div>
            </nav>

            <div className="flex-1 w-full flex flex-col lg:flex-row items-center justify-center p-6 md:p-12 lg:px-24 gap-12 lg:gap-24 pt-32 z-10">
                {/* Left: Huge Typography */}
                <div className="w-full lg:w-1/2 space-y-4 text-left hidden md:block">
                    <h1 className="text-6xl md:text-8xl lg:text-[9rem] font-serif uppercase tracking-tighter leading-none">
                        Join <br />
                        <span className="italic opacity-80">The Crew.</span>
                    </h1>
                    <p className="font-sans text-xs md:text-sm uppercase tracking-[0.3em] text-muted-foreground max-w-md mt-8">
                        Begin your journey into absolute musical synchrony.
                    </p>
                </div>

                {/* Right: Center on Mobile, Right on Desktop */}
                <div className="w-full lg:w-1/2 max-w-md">
                    <div className="md:hidden text-left space-y-4 mb-12">
                        <h1 className="text-5xl font-serif uppercase tracking-tighter leading-none">
                            Join <br />
                            <span className="italic opacity-80">The Crew.</span>
                        </h1>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-12">
                        <div className="space-y-8">
                            <div className="group relative">
                                <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4 group-focus-within:text-foreground transition-colors">
                                    Username
                                </label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full py-4 border-b border-border focus:border-accent outline-none font-serif text-2xl lg:text-3xl transition-colors bg-transparent text-foreground placeholder:text-muted-foreground"
                                    placeholder="Maverick"
                                />
                            </div>

                            <div className="group relative">
                                <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4 group-focus-within:text-foreground transition-colors">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full py-4 border-b border-border focus:border-accent outline-none font-serif text-2xl lg:text-3xl transition-colors bg-transparent text-foreground placeholder:text-muted-foreground"
                                    placeholder="name@example.com"
                                />
                            </div>

                            <div className="group relative">
                                <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4 group-focus-within:text-foreground transition-colors">
                                    Password
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full py-4 border-b border-border focus:border-accent outline-none font-serif text-2xl lg:text-3xl transition-colors bg-transparent text-foreground placeholder:text-muted-foreground tracking-[0.2em]"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        {error && (
                            <p className="text-red-500 text-xs font-mono text-left">{error}</p>
                        )}

                        <button
                            type="submit"
                            className="w-full bg-accent text-accent-foreground py-6 text-xs font-bold uppercase tracking-[0.2em] hover:opacity-80 transition-opacity"
                        >
                            Create Account
                        </button>
                    </form>

                    <div className="mt-12 space-y-8">
                        <div className="flex items-center gap-4">
                            <div className="flex-1 border-t border-border"></div>
                            <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">or</span>
                            <div className="flex-1 border-t border-border"></div>
                        </div>

                        <div className="space-y-4">
                            <Link
                                href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                                className="flex items-center justify-center w-full py-5 border border-border text-foreground text-xs font-bold uppercase tracking-[0.2em] hover:bg-accent hover:text-accent-foreground hover:border-accent transition-colors"
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
                                className="w-full text-left text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
                            >
                                <span className="w-4 h-[1px] bg-muted-foreground group-hover:bg-foreground transition-colors"></span>
                                Join as Guest
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Minimalist Watermark SVG Background */}
            <svg viewBox="0 0 100 100" className="absolute -bottom-24 -left-24 w-96 h-96 text-muted-foreground opacity-5 pointer-events-none animate-spin-reverse-slow">
                <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="1" />
                <circle cx="50" cy="50" r="15" fill="none" stroke="currentColor" strokeWidth="1" />
                <circle cx="50" cy="50" r="2" fill="currentColor" />
                <path d="M50 5 L50 15 M50 95 L50 85 M5 50 L15 50 M95 50 L85 50" stroke="currentColor" strokeWidth="1" />
            </svg>
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

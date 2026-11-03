"use client";

import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import Link from "next/link";

export default function Home() {
  const { user } = useAuth();

  const [activeFeature, setActiveFeature] = useState(0);

  const features = [
    {
      title: "YouTube, together",
      description: "Search any song or paste a link. Everyone in the room hears the same moment, and nobody needs an account.",
      imgUrl: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=1000&auto=format&fit=crop"
    },
    {
      title: "Spotify, too",
      description: "Connect a Premium account and play from Spotify. For now, only approved accounts can connect.",
      imgUrl: "https://images.unsplash.com/photo-1543807535-eceef0bc6599?q=80&w=1000&auto=format&fit=crop"
    },
    {
      title: "Talk over it",
      description: "Chat and throw reactions while it plays, right next to the music. Vote up what should play next.",
      imgUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=1000&auto=format&fit=crop"
    },
    {
      title: "Walk right in",
      description: "Send a link or a six-letter code. Guests are welcome, and the host decides who comes in.",
      imgUrl: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=1000&auto=format&fit=crop"
    }
  ];

  return (
    <main className="min-h-screen bg-background text-foreground transition-colors duration-300 overflow-x-hidden selection:bg-accent selection:text-accent-foreground">

      {/* 1. HERO SECTION */}
      <section className="relative min-h-screen flex flex-col justify-center px-6 md:px-12 lg:px-24">
        {/* Navbar */}
        <nav className="absolute top-0 left-0 w-full p-6 md:p-12 flex justify-between items-center z-10">
          <div className="font-serif text-2xl tracking-tight">TuneVerse</div>
          <div className="flex gap-5 text-sm md:gap-8">
            {user ? (
              <Link href="/lobby" className="underline-offset-4 transition-colors hover:text-signal hover:underline">Lobby</Link>
            ) : (
              <>
                <Link href="/login" className="underline-offset-4 transition-colors hover:text-signal hover:underline">Log In</Link>
                <Link href="/signup" className="underline-offset-4 transition-colors hover:text-signal hover:underline">Sign Up</Link>
              </>
            )}
          </div>
        </nav>

        {/* Hero Content */}
        <div className="z-10 mt-12 md:mt-0 flex flex-col md:flex-row items-start md:items-end justify-between">
          <div className="space-y-4">
            <h1 className="font-serif text-7xl leading-[0.92] tracking-tight md:text-9xl lg:text-[11rem]">
              Listen <br />
              <span className="italic text-signal">Together.</span><br />
              Live.
            </h1>
            <p className="mt-8 max-w-md font-serif text-xl italic text-muted-foreground md:text-2xl">
              Start a room, play a song, and everyone hears the same second of it.
            </p>
          </div>

          <div className="mt-12 md:mt-0 flex flex-col items-center md:items-end gap-6">
            {/* Minimalist spinning SVG */}
            <svg viewBox="0 0 100 100" className="w-24 h-24 md:w-32 md:h-32 animate-spin-slow">
              <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="1" className="opacity-20" />
              <circle cx="50" cy="50" r="15" fill="none" stroke="currentColor" strokeWidth="1" />
              <circle cx="50" cy="50" r="2" fill="currentColor" />
              <path d="M50 5 L50 15 M50 95 L50 85 M5 50 L15 50 M95 50 L85 50" stroke="currentColor" strokeWidth="1" />
            </svg>
            <Link
              href={user ? "/lobby" : "/login"}
              className="bg-signal px-8 py-4 text-sm tracking-wide text-signal-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Go to the lobby
            </Link>
          </div>
        </div>
      </section>

      {/* 2. SCROLLING MARQUEE */}
      <div className="relative border-y border-border py-4 md:py-6 overflow-hidden bg-background">
        <div className="flex w-[200%] animate-marquee whitespace-nowrap">
          <div className="w-1/2 flex justify-around font-serif text-3xl md:text-5xl uppercase tracking-tighter opacity-80">
            <span>Listen Together</span>
            <span className="mx-8 font-serif italic text-signal">&amp;</span>
            <span>Same Second</span>
            <span className="mx-8 font-serif italic text-signal">&amp;</span>
            <span>YouTube</span>
            <span className="mx-8 font-serif italic text-signal">&amp;</span>
            <span>Spotify</span>
            <span className="mx-8 font-serif italic text-signal">&amp;</span>
          </div>
          <div className="w-1/2 flex justify-around font-serif text-3xl md:text-5xl uppercase tracking-tighter opacity-80">
            <span>Listen Together</span>
            <span className="mx-8 font-serif italic text-signal">&amp;</span>
            <span>Same Second</span>
            <span className="mx-8 font-serif italic text-signal">&amp;</span>
            <span>YouTube</span>
            <span className="mx-8 font-serif italic text-signal">&amp;</span>
            <span>Spotify</span>
            <span className="mx-8 font-serif italic text-signal">&amp;</span>
          </div>
        </div>
      </div>

      {/* 3. THE FEATURES (Interactive Split Screen) */}
      <section className="py-24 px-6 md:px-12 lg:px-24 min-h-screen flex items-center">
        <div className="w-full flex flex-col lg:flex-row gap-12 lg:gap-24">
          {/* Left: Interactive List */}
          <div className="w-full lg:w-1/2 flex flex-col justify-center space-y-12">
            <h2 className="mb-8 border-b border-foreground pb-3 font-serif text-xl italic">
              What you can do
            </h2>

            <div className="space-y-8">
              {features.map((feature, idx) => (
                <div
                  key={idx}
                  className="group cursor-pointer"
                  onMouseEnter={() => setActiveFeature(idx)}
                >
                  <h3 className={`font-serif text-4xl md:text-6xl tracking-tight transition-opacity duration-300 ${activeFeature === idx ? 'opacity-100' : 'opacity-30'}`}>
                    {feature.title}
                  </h3>
                  <div className={`overflow-hidden transition-all duration-500 ease-in-out ${activeFeature === idx ? 'max-h-40 mt-4 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <p className="max-w-sm text-lg text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Image Display */}
          <div className="w-full lg:w-1/2 min-h-[400px] lg:min-h-0 relative bg-muted overflow-hidden">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${activeFeature === idx ? 'opacity-100 grayscale-0' : 'opacity-0 grayscale'}`}
                style={{
                  backgroundImage: `url(${feature.imgUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                <div className="absolute inset-0 bg-signal/15" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. HOW TO START */}
      <section className="py-24 bg-muted border-t border-border">
        <div className="max-w-6xl mx-auto px-6 md:px-12">
          <div className="text-center mb-24">
            <h2 className="font-serif text-5xl italic tracking-tight md:text-7xl">Three steps.</h2>
            <p className="mt-4 font-serif text-xl italic text-muted-foreground">That really is all of it.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
            {[
              { num: "01", title: "Start a room", desc: "Give it a name, or don't. It takes a second." },
              { num: "02", title: "Send the link", desc: "Your friends tap it and knock. You let them in." },
              { num: "03", title: "Press play", desc: "Pick a song from YouTube or Spotify. Everyone hears it together." }
            ].map((step, idx) => (
              <div key={idx} className="flex flex-col items-center text-center space-y-6">
                <span className="font-serif text-7xl italic text-signal">{Number(step.num)}</span>
                                <h4 className="font-serif text-3xl">{step.title}</h4>
                <p className="max-w-xs text-[17px] text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. FINAL CTA */}
      <section className="py-32 px-6 flex flex-col items-center justify-center text-center border-t border-border">
        <h2 className="mb-12 font-serif text-5xl tracking-tight md:text-7xl lg:text-8xl">
          Ready to drop<br /><span className="italic text-signal">the needle?</span>
        </h2>
        <div className="flex flex-col sm:flex-row gap-6">
          <Link
            href="/signup"
            className="bg-signal px-12 py-5 text-sm tracking-wide text-signal-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Create Account
          </Link>
          <Link
            href="/login"
            className="border border-foreground px-12 py-5 text-sm tracking-wide transition-colors hover:bg-foreground hover:text-background"
          >
            Join as Guest
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="flex flex-col items-center justify-between border-t border-border px-6 py-8 text-sm text-muted-foreground md:flex-row md:px-12">
        <span>© {new Date().getFullYear()} TuneVerse</span>
        <div className="flex gap-6 mt-4 md:mt-0">
          <a href="https://github.com/rahmanfaizur/TuneVerse" className="hover:text-foreground transition-colors">GitHub</a>
        </div>
      </footer>

    </main>
  );
}

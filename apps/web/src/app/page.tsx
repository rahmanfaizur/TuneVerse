"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import Link from "next/link";
import { ThemeProvider } from "../components/ThemeProvider";

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Used for the interactive feature list image swap
  const [activeFeature, setActiveFeature] = useState(0);

  const features = [
    {
      title: "01. SPOTIFY SYNC",
      description: "Connect your Premium account. Your playback state is mirrored across the room in milliseconds.",
      imgUrl: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=1000&auto=format&fit=crop"
    },
    {
      title: "02. REAL-TIME LAB",
      description: "Chat, react, and vibe without leaving the music player. A unified interface for the crew.",
      imgUrl: "https://images.unsplash.com/photo-1543807535-eceef0bc6599?q=80&w=1000&auto=format&fit=crop"
    },
    {
      title: "03. GUEST ACCESS",
      description: "Jump into a session instantly via deep link. No account creation required to listen in.",
      imgUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=1000&auto=format&fit=crop"
    }
  ];

  // If user is already logged in, we can show a localized redirect or just let them enter lobby from the button.
  // We won't auto-redirect unauthenticated users anymore so they can see the landing page.

  return (
    <main className="min-h-screen bg-background text-foreground transition-colors duration-300 overflow-x-hidden selection:bg-accent selection:text-accent-foreground">

      {/* 1. HERO SECTION */}
      <section className="relative min-h-screen flex flex-col justify-center px-6 md:px-12 lg:px-24">
        {/* Navbar */}
        <nav className="absolute top-0 left-0 w-full p-6 md:p-12 flex justify-between items-center z-10">
          <div className="font-serif text-2xl tracking-tighter uppercase">TuneVerse</div>
          <div className="flex gap-4 md:gap-8 font-sans text-xs uppercase tracking-[0.2em]">
            {user ? (
              <Link href="/lobby" className="hover:opacity-50 transition">Enter Lobby</Link>
            ) : (
              <>
                <Link href="/login" className="hover:opacity-50 transition">Log In</Link>
                <Link href="/signup" className="hover:opacity-50 transition">Sign Up</Link>
              </>
            )}
          </div>
        </nav>

        {/* Hero Content */}
        <div className="z-10 mt-12 md:mt-0 flex flex-col md:flex-row items-start md:items-end justify-between">
          <div className="space-y-4">
            <h1 className="text-6xl md:text-8xl lg:text-[10rem] font-serif uppercase tracking-tighter leading-none">
              Listen <br />
              <span className="italic opacity-80">Together.</span><br />
              Live.
            </h1>
            <p className="font-sans text-xs md:text-sm uppercase tracking-[0.3em] text-muted-foreground max-w-md mt-8">
              The high-fidelity synchronization engine for absolute musical harmony.
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
              className="px-8 py-4 bg-accent text-accent-foreground font-sans text-xs uppercase tracking-[0.2em] hover:opacity-80 transition"
            >
              Enter The Lobby
            </Link>
          </div>
        </div>
      </section>

      {/* 2. SCROLLING MARQUEE */}
      <div className="relative border-y border-border py-4 md:py-6 overflow-hidden bg-background">
        <div className="flex w-[200%] animate-marquee whitespace-nowrap">
          <div className="w-1/2 flex justify-around font-serif text-3xl md:text-5xl uppercase tracking-tighter opacity-80">
            <span>Sync Your Vibe</span>
            <span className="mx-8 font-sans text-xl opacity-30">///</span>
            <span>No Delay</span>
            <span className="mx-8 font-sans text-xl opacity-30">///</span>
            <span>Pure Audio</span>
            <span className="mx-8 font-sans text-xl opacity-30">///</span>
            <span>Zero Setup</span>
            <span className="mx-8 font-sans text-xl opacity-30">///</span>
          </div>
          <div className="w-1/2 flex justify-around font-serif text-3xl md:text-5xl uppercase tracking-tighter opacity-80">
            <span>Sync Your Vibe</span>
            <span className="mx-8 font-sans text-xl opacity-30">///</span>
            <span>No Delay</span>
            <span className="mx-8 font-sans text-xl opacity-30">///</span>
            <span>Pure Audio</span>
            <span className="mx-8 font-sans text-xl opacity-30">///</span>
            <span>Zero Setup</span>
            <span className="mx-8 font-sans text-xl opacity-30">///</span>
          </div>
        </div>
      </div>

      {/* 3. THE FEATURES (Interactive Split Screen) */}
      <section className="py-24 px-6 md:px-12 lg:px-24 min-h-screen flex items-center">
        <div className="w-full flex flex-col lg:flex-row gap-12 lg:gap-24">
          {/* Left: Interactive List */}
          <div className="w-full lg:w-1/2 flex flex-col justify-center space-y-12">
            <h2 className="font-sans text-[10px] uppercase tracking-widest text-muted-foreground mb-8 border-b border-border pb-4">
              The Sound of Style
            </h2>

            <div className="space-y-8">
              {features.map((feature, idx) => (
                <div
                  key={idx}
                  className="group cursor-pointer"
                  onMouseEnter={() => setActiveFeature(idx)}
                >
                  <h3 className={`font-serif text-4xl md:text-6xl uppercase tracking-tighter transition-opacity duration-300 ${activeFeature === idx ? 'opacity-100' : 'opacity-30'}`}>
                    {feature.title}
                  </h3>
                  <div className={`overflow-hidden transition-all duration-500 ease-in-out ${activeFeature === idx ? 'max-h-40 mt-4 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <p className="font-sans text-xs md:text-sm uppercase tracking-widest text-muted-foreground max-w-sm">
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
                <div className="absolute inset-0 bg-accent/20" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. HOW TO START */}
      <section className="py-24 bg-muted border-t border-border">
        <div className="max-w-6xl mx-auto px-6 md:px-12">
          <div className="text-center mb-24">
            <h2 className="font-serif text-5xl md:text-7xl uppercase tracking-tighter">Three Steps.</h2>
            <p className="font-sans text-xs uppercase tracking-[0.3em] text-muted-foreground mt-6">Zero Friction.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
            {[
              { num: "01", title: "Create Session", desc: "Name your room and set the mood." },
              { num: "02", title: "Share ID", desc: "Send the unique code to your crew." },
              { num: "03", title: "Press Play", desc: "The engine handles the absolute sync." }
            ].map((step, idx) => (
              <div key={idx} className="flex flex-col items-center text-center space-y-6">
                <span className="font-serif text-6xl text-border italic">{step.num}</span>
                <div className="w-12 h-[1px] bg-accent" />
                <h4 className="font-sans text-sm uppercase tracking-widest font-bold">{step.title}</h4>
                <p className="font-sans text-xs uppercase tracking-widest text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. FINAL CTA */}
      <section className="py-32 px-6 flex flex-col items-center justify-center text-center border-t border-border">
        <h2 className="font-serif text-5xl md:text-7xl lg:text-8xl uppercase tracking-tighter mb-12">
          Ready to drop<br /><span className="italic">the needle?</span>
        </h2>
        <div className="flex flex-col sm:flex-row gap-6">
          <Link
            href="/signup"
            className="px-12 py-5 bg-accent text-accent-foreground font-sans text-xs font-bold uppercase tracking-[0.2em] hover:scale-105 transition-transform"
          >
            Create Account
          </Link>
          <Link
            href="/login"
            className="px-12 py-5 border border-accent text-foreground font-sans text-xs font-bold uppercase tracking-[0.2em] hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            Join as Guest
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border flex flex-col md:flex-row justify-between items-center px-6 md:px-12 font-sans text-[10px] uppercase tracking-widest text-muted-foreground">
        <span>© {new Date().getFullYear()} TuneVerse. All rights reserved.</span>
        <div className="flex gap-6 mt-4 md:mt-0">
          <Link href="#" className="hover:text-foreground transition-colors">Privacy</Link>
          <Link href="#" className="hover:text-foreground transition-colors">Terms</Link>
        </div>
      </footer>

    </main>
  );
}

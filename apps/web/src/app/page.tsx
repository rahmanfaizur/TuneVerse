"use client";

import Link from "next/link";
import { useAuth } from "../context/AuthContext";

const FEATURES = [
  { title: "YouTube for everyone", text: "Search any song or paste a link. Nobody needs an account or a subscription." },
  { title: "Spotify if you've got it", text: "Connect Premium to play from Spotify. Approved accounts only for now." },
  { title: "Chat while it plays", text: "Talk, react and vote on what's next, right beside the music." },
  { title: "You choose who comes in", text: "Share a link or a short code. The host lets people in." },
];

const STEPS = [
  { title: "Start a room", text: "Give it a name. It takes a few seconds." },
  { title: "Send the link", text: "Your friends tap it, and you let them in." },
  { title: "Press play", text: "Everyone hears the same second of the song." },
];

export default function Home() {
  const { user } = useAuth();
  const startHref = user ? "/lobby" : "/login";

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-5 md:px-8">
      <nav className="flex items-center justify-between py-5">
        <span className="text-xl font-semibold tracking-tight">TuneVerse</span>
        <div className="flex items-center gap-5 text-[15px]">
          {user ? (
            <Link href="/lobby" className="underline-offset-4 hover:text-signal hover:underline">Lobby</Link>
          ) : (
            <>
              <Link href="/login" className="underline-offset-4 hover:text-signal hover:underline">Sign in</Link>
              <Link href="/signup" className="rounded-full bg-signal px-4 py-2 font-medium text-signal-foreground transition-opacity hover:opacity-90">Sign up</Link>
            </>
          )}
        </div>
      </nav>

      <section className="pb-10 pt-10 text-center md:pt-16">
        <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl">
          Listen <em>together,</em>
          <br />
          wherever you are.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground md:text-xl">
          Start a room, play a song from YouTube or Spotify, and everyone hears the same second of it.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link href={startHref} className="rounded-full bg-signal px-7 py-3.5 font-medium text-signal-foreground transition-opacity hover:opacity-90">
            Start listening
          </Link>
          {!user && (
            <Link href="/login" className="rounded-full border border-border px-7 py-3.5 font-medium transition-colors hover:bg-muted">
              Join as a guest
            </Link>
          )}
        </div>
      </section>

      <section className="grid gap-4 py-8 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((feature) => (
          <div key={feature.title} className="rounded-3xl bg-muted p-6">
            <h2 className="text-lg font-semibold tracking-tight">{feature.title}</h2>
            <p className="mt-1.5 text-[15px] text-muted-foreground">{feature.text}</p>
          </div>
        ))}
      </section>

      <section className="py-14 text-center">
        <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Three steps, <em>that&apos;s it</em></h2>
        <ol className="mt-8 grid gap-8 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title}>
              <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-signal font-medium text-signal-foreground">{i + 1}</span>
              <h3 className="mt-3 text-lg font-semibold tracking-tight">{step.title}</h3>
              <p className="mt-1 text-[15px] text-muted-foreground">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <footer className="flex flex-col items-center justify-between gap-2 border-t border-border py-6 text-sm text-muted-foreground sm:flex-row">
        <span>© {new Date().getFullYear()} TuneVerse</span>
        <a href="https://github.com/rahmanfaizur/TuneVerse" className="underline-offset-4 hover:text-foreground hover:underline">GitHub</a>
      </footer>
    </main>
  );
}

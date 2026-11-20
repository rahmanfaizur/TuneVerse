"use client";

import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { buttonClass } from "../components/Button";
import Overprint from "../components/poster/Overprint";
import SiteHeader from "../components/poster/SiteHeader";
import Ticket from "../components/poster/Ticket";

// Printed like the bill on a gig poster, biggest act first.
const LINE_UP = [
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
      <SiteHeader>
        {user ? (
          <Link href="/lobby" className="ink-link font-semibold">Lobby</Link>
        ) : (
          <>
            <Link href="/login" className="ink-link font-semibold">Sign in</Link>
            <Link href="/signup" className={`${buttonClass("primary")} !px-4 !py-2`}>Sign up</Link>
          </>
        )}
      </SiteHeader>

      <section className="grid items-center gap-10 py-12 md:py-16 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div>
          <Overprint text="Listen together" className="text-[clamp(4.5rem,15vw,10.5rem)]" />
          <p className="mt-6 max-w-md text-lg leading-snug md:text-xl">
            Start a room, play a song from YouTube or Spotify, and everyone hears the same second of it.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link href={startHref} className={buttonClass("primary")}>Start listening</Link>
            {!user && <Link href="/login" className={buttonClass("outline")}>Join as a guest</Link>}
          </div>
        </div>

        <Ticket
          aria-label="What an invite looks like"
          className="mx-auto w-full max-w-sm -rotate-3 bg-pink text-on-pink lg:max-w-none"
          stubClassName="bg-blue text-paper px-2 py-5"
          stubWidth="6.5rem"
          stub={
            <>
              <span className="label">Admit</span>
              <span className="display text-4xl">One</span>
              <span className="label mt-2">Code</span>
              <span className="text-lg font-bold tracking-widest">4F7K2Q</span>
            </>
          }
        >
          <div className="p-5 md:p-6">
            <p className="label">Your invite</p>
            <p className="display mt-2 text-4xl md:text-5xl">Friday night mix</p>
            <p className="mt-3 text-[15px] font-semibold">Hosted by you. Your friends tap the link, you let them in.</p>
          </div>
        </Ticket>
      </section>

      <section aria-labelledby="line-up" className="border-t-2 border-rule py-10 md:py-14">
        <h2 id="line-up" className="label text-soft">The line-up</h2>
        <ul className="mt-4">
          {LINE_UP.map((act, i) => (
            <li key={act.title} className="grid gap-1 border-b-2 border-rule py-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] md:items-end md:gap-8">
              <h3 className={`display text-blue ${i === 0 ? "text-5xl md:text-7xl" : "text-4xl md:text-5xl"}`}>{act.title}</h3>
              <p className="max-w-sm text-[15px] leading-snug md:pb-1">{act.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="how" className="pb-14">
        <h2 id="how" className="label text-soft">How the night goes</h2>
        <ol className="mt-5 grid gap-8 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-4">
              <span className="display text-6xl leading-[0.8] text-pink" aria-hidden="true">{i + 1}</span>
              <span>
                <span className="block text-lg font-bold">{step.title}</span>
                <span className="mt-1 block text-[15px] text-soft">{step.text}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <footer className="flex flex-col justify-between gap-2 border-t-2 border-rule py-5 text-sm sm:flex-row">
        <span>© {new Date().getFullYear()} TuneVerse</span>
        <a href="https://github.com/rahmanfaizur/TuneVerse" className="ink-link">GitHub</a>
      </footer>
    </main>
  );
}

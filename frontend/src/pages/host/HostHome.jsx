// frontend/src/pages/host/HostHome.jsx

import React from "react";
import ActiveDeckCard from "../../components/host/ActiveDeckCard.jsx";
import { Link, useNavigate } from "react-router-dom";

export default function HostHome() {
  const navigate = useNavigate();

  function navigateToDeckManager() {
    navigate("/host/decks");
  }

  function navigateToSessionSetup() {
    navigate("/host/session");
  }

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-slate-800 flex items-center justify-center">
              <span className="font-bold">Φ</span>
            </div>
            <div>
              <div className="text-sm text-slate-400">Host View</div>
              <div className="font-semibold">Fysics is Phun</div>
            </div>
          </div>

          {/* Use Link to avoid full page reload */}
          <Link
            className="text-sm text-slate-300 hover:text-white underline underline-offset-4"
            to="/join"
          >
            Go to Join Page (later)
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-semibold">Host Dashboard</h1>
        <p className="mt-2 text-slate-300">
          Host flow: Session Setup → Create Session → Join Code/QR → Lobby → Run game.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {/* Card 1 */}
          <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
            <h2 className="text-lg font-semibold">Create Session</h2>
            <p className="mt-2 text-sm text-slate-300">
              Configure timers and options, then create a session (join code + host URL).
            </p>

            <button
              onClick={navigateToSessionSetup}
              className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
            >
              Go to Session Setup
            </button>
          </section>

          {/* Card 2 */}
          <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
            <h2 className="text-lg font-semibold">Decks (CSV)</h2>
            <p className="mt-2 text-sm text-slate-300">
              Upload a CSV deck, preview it, then set it as the Active Deck.
            </p>

            <button
              onClick={navigateToDeckManager}
              className="mt-4 w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              Open Deck Manager
            </button>
          </section>
        </div>

        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          <h2 className="text-lg font-semibold">Planned Host Flow</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-300">
            <li>Session Setup (timers, options)</li>
            <li>Create Session → display Join Code + Join URL + QR</li>
            <li>Lobby: roster updates + assign Jury (min 1) + Start Game</li>
            <li>Stage 1 → Stage 2 → Results → Final + Export</li>
          </ol>
        </div>

        <div className="mt-6">
          <ActiveDeckCard />
        </div>
      </main>
    </div>
  );
}

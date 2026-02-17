/**
 * HostDecks Page
 * This is the future Deck Manager page.
 *
 * For now it only includes CSV upload so we can test /upload-deck.
 * Later we’ll add:
 *  - deck list
 *  - preview
 *  - select deck for session
 */

import React from "react";
import DeckUploadCard from "../../components/host/DeckUploadCard";
import { Link } from "react-router-dom";



export default function HostDecks() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div>
            <div className="text-sm text-slate-400">Host View</div>
            <div className="font-semibold">Deck Manager</div>
          </div>

        <Link
            className="text-sm text-slate-300 hover:text-white underline underline-offset-4"
            to="/host"
            >
            Back to Host Home
        </Link>

        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <DeckUploadCard />
      </main>
    </div>
  );
}

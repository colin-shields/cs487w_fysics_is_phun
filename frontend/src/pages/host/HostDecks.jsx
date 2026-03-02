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
import { Link } from "react-router-dom";
import DeckListPanel from "../../components/host/DeckListPanel";

/**
 * Page component for the Host's Deck Management interface.
 * Transitions from a basic list to a full CRUD interface via modals 
 * contained within the DeckListPanel.
 */
export default function HostDecks() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Navigation Header */}
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[95%] items-center justify-between px-4 py-3">
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Host Administration
            </div>
            <div className="text-lg font-bold">Deck Manager</div>
          </div>

          <Link
            className="text-sm font-medium text-slate-400 transition-colors hover:text-white"
            to="/host"
          >
            &larr; Back to Host Home
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-[85%] px-4 py-8">

        {/* DeckListPanel contains the primary UI for deck interaction, 
           including Create/Upload action buttons and Modal state management.
        */}
        <div className="space-y-8">
          <DeckListPanel />
        </div>
      </main>

      {/* Footer / Contextual Info */}
      <footer className="mx-auto max-w-5xl px-4 py-12 border-t border-slate-900">
        <p className="text-center text-xs text-slate-600">
          Fysics is Phun &copy; {new Date().getFullYear()} - Academic Content Management
        </p>
      </footer>
    </div>
  );
}
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-[#0a0523] to-[#0d011c] text-white">
      {/* Navigation Header */}
      <header className="sticky top-0 z-[60] border-b border-indigo-900/50 bg-[#0a0523]/80 backdrop-blur shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
        <div className="mx-auto flex max-w-[95%] items-center justify-between px-6 py-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
              Host Administration
            </div>
            <div className="text-lg font-bold tracking-wide">Deck Manager</div>
          </div>

          <Link
            className="text-sm font-semibold text-indigo-300 hover:text-white underline underline-offset-4 transition-colors"
            to="/host"
          >
            &larr; Back to Host Home
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-[85%] px-6 py-10 relative">
        {/* Subtle background glow */}
        <div className="absolute top-10 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none"></div>

        {/* DeckListPanel contains the primary UI for deck interaction, 
           including Create/Upload action buttons and Modal state management.
        */}
        <div className="space-y-8 relative z-10">
          <DeckListPanel />
        </div>
      </main>

      {/* Footer / Contextual Info */}
      <footer className="mx-auto max-w-5xl px-6 py-12 border-t border-indigo-500/20 mt-10">
        <p className="text-center text-xs font-medium text-indigo-300/50 uppercase tracking-widest">
          Fysics is Phun &copy; {new Date().getFullYear()} - Academic Content Management
        </p>
      </footer>
    </div>
  );
}
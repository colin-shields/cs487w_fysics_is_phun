import React from "react";
import { Link } from "react-router-dom";
import DeckListPanel from "../../components/host/DeckListPanel";

export default function HostDecks() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-[#0a0523] to-[#0d011c] text-white">
      {/* Navigation Header - Matches Home/Setup styling */}
      <header className="sticky top-0 z-[60] border-b border-indigo-900/50 bg-[#0a0523]/80 backdrop-blur shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
        <div className="mx-auto flex max-w-[95%] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 shadow-[0_0_15px_rgba(139,92,246,0.4)] text-white">
              <span className="font-bold text-lg">Φ</span>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
                Host Administration
              </div>
              <div className="text-lg font-bold tracking-wide">
                Deck Manager
              </div>
            </div>
          </div>

          <Link
            className="text-sm font-semibold uppercase tracking-wider text-indigo-300 hover:text-white transition-colors"
            to="/host"
          >
            &larr; Back to Host Home
          </Link>
        </div>
      </header>

      {/* Main Content Area - Widened to prevent overlap */}
      <main className="mx-auto max-w-[98%] xl:max-w-[1600px] px-4 py-10 relative">
        <div className="absolute top-10 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="relative z-10">
          {/* IMPORTANT: Inside DeckListPanel, ensure the container 
              is using "flex flex-col lg:flex-row" with "gap-8"
          */}
          <DeckListPanel />
        </div>
      </main>

      <footer className="mx-auto max-w-5xl px-6 py-12 border-t border-indigo-500/20 mt-10">
        <p className="text-center text-xs font-medium text-indigo-300/50 uppercase tracking-widest">
          Fysics is Phun &copy; {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}

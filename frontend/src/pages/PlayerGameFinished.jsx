/**
 * PlayerGameFinished.jsx
 * Shown to players when the host finishes all questions and ends the game
 */

import React from "react";
import { useNavigate } from "react-router-dom";

export default function PlayerGameFinished() {
  const navigate = useNavigate();

  function onReturnHome() {
    navigate("/join");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-8 max-w-md text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-2xl font-semibold text-emerald-400 mb-2">Game Finished!</h2>
        <p className="text-slate-300 mb-6">
          Thank you for playing. The host has finished all questions for this session.
        </p>
        <button
          onClick={onReturnHome}
          className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          Return to Join Page
        </button>
      </div>
    </div>
  );
}

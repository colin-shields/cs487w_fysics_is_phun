/**
 * HostLeaderboard.jsx
 * Leaderboard view shown after host finishes all questions
 *
 * Purpose:
 * - Display all players in the session
 * - Show game completion status
 * - Option to return to deck selection
 */

import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { buildUrl } from "../../api/httpClient";

export default function HostLeaderboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { roomCode } = location.state || {};
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomCode) {
      navigate("/host");
      return;
    }

    // Fetch session status to get updated player list
    async function fetchPlayers() {
      try {
        const res = await fetch(buildUrl(`/session-status/${roomCode}`));
        if (res.ok) {
          const data = await res.json();
          setPlayers(data.players || []);
        }
      } catch (err) {
        console.error("Failed to fetch session status", err);
      } finally {
        setLoading(false);
      }
    }

    fetchPlayers();
    const interval = setInterval(fetchPlayers, 2000);
    return () => clearInterval(interval);
  }, [roomCode, navigate]);

  function onReturnHome() {
    navigate("/host");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-950">
      {/* Header */}
      <header className="sticky top-0 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div>
            <div className="text-sm text-slate-400">Game Complete</div>
            <div className="font-semibold">Final Results</div>
          </div>
          <div className="text-sm text-slate-300">
            Room: <span className="font-semibold text-emerald-400">{roomCode}</span>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-8">
          <h1 className="text-3xl font-bold text-center mb-2 text-emerald-400">Game Finished!</h1>
          <p className="text-center text-slate-300 mb-8">Thank you for playing</p>

          {loading ? (
            <div className="text-center text-slate-300">Loading players...</div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm font-semibold text-slate-400 mb-4">
                Players ({players.length})
              </div>
              {players.length > 0 ? (
                <div className="space-y-2">
                  {players.map((player, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg bg-slate-800/50 p-4 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-semibold">
                          {idx + 1}
                        </div>
                        <div className="text-slate-100 font-medium">{player}</div>
                      </div>
                      <div className="text-xs text-slate-400">Player</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-slate-400">No players joined this session</div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="mt-8 flex gap-4">
            <button
              onClick={onReturnHome}
              className="flex-1 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              Return to Home
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

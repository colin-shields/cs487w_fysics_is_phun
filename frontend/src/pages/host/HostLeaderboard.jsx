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
import confetti from "canvas-confetti";

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
          // Sort players by score (highest first)
          const sortedPlayers = (data.players || []).sort(
            (a, b) => b.score - a.score,
          );
          setPlayers(sortedPlayers);
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

  // Confetti effect
  useEffect(() => {
    if (!loading && players.length > 0) {
      // --- INITIAL BURST ---
      const count = 200;
      const defaults = {
        origin: { y: 0.7 },
        spread: 90,
        ticks: 200, // Particles last longer on screen
        gravity: 0.8, // Lower gravity = more gradual, floaty fall
        startVelocity: 45, // Higher velocity = shoots farther
        scalar: 1.2,
      };

      // Fire from left
      confetti({
        ...defaults,
        particleCount: count / 2,
        angle: 60,
        origin: { x: 0, y: 0.6 },
      });

      // Fire from right
      confetti({
        ...defaults,
        particleCount: count / 2,
        angle: 120,
        origin: { x: 1, y: 0.6 },
      });

      // --- 2. GRADUAL FOUNTAIN ---
      const duration = 15 * 1000;
      const animationEnd = Date.now() + duration;

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        // We use a lower particle count but higher "ticks" for a smoother look
        confetti({
          particleCount: 2,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.8 },
          startVelocity: 35,
          gravity: 0.7,
          colors: ["#10b981", "#6366f1"],
        });

        confetti({
          particleCount: 2,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.8 },
          startVelocity: 35,
          gravity: 0.7,
          colors: ["#10b981", "#6366f1"],
        });
      }, 300); // Firing very small amounts frequently creates a "fountain" effect

      return () => clearInterval(interval);
    }
  }, [loading, players.length]);

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
            Room:{" "}
            <span className="font-semibold text-emerald-400">{roomCode}</span>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-8">
          <h1 className="text-3xl font-bold text-center mb-2 text-emerald-400">
            Game Finished!
          </h1>

          {players.length > 0 ? (
            <div className="mb-8 text-center">
              <div className="text-sm uppercase tracking-widest text-slate-500">
                Champion
              </div>
              <div className="text-xl font-black text-white">
                Winner:{" "}
                <span className="text-emerald-400">
                  {players[0].name || players[0]}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-center text-slate-300 mb-8">
              Thank you for playing!
            </p>
          )}

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
                        <div className="text-slate-100 font-medium">
                          {player}
                        </div>
                      </div>
                      <div className="text-xs text-slate-400">Player</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-slate-400">
                  No players joined this session
                </div>
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

import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { buildUrl, httpDelete } from "../../api/httpClient";
import { getHostCode } from "../../utils/hostAuth";

export default function HostLobby() {
  const location = useLocation();
  const navigate = useNavigate();
  const { roomCode } = location.state || {};

  const [players, setPlayers] = useState([]);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!roomCode) return;

    async function poll() {
      const hostCode = getHostCode?.() || "";
      const headers = hostCode ? { "X-Host-Code": hostCode } : {};
      try {
        const res = await fetch(buildUrl(`/session-status/${roomCode}`), { headers });
        if (res.ok) {
          const data = await res.json();
          setPlayers(data.players || []);
        }
      } catch (err) {
        setError("Connection lost");
      }
    }

    poll();
    const iv = setInterval(poll, 1500);
    return () => clearInterval(iv);
  }, [roomCode]);

  async function onBackClick() {
    setCancelling(true);
    const hostCode = getHostCode?.() || "";
    const headers = hostCode ? { "X-Host-Code": hostCode } : {};
    
    try {
      await httpDelete(`/session/${roomCode}`, headers);
    } catch (err) {
      console.error("Failed to cancel session:", err);
    }
    
    navigate("/host/session");
  }

  if (!roomCode) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-300">No session information. Go back to setup.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-950">
      <header className="sticky top-0 bg-slate-950/80 border-b border-slate-800 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-sm text-slate-400">Host View</div>
            <div className="font-semibold">Session Lobby</div>
          </div>
          <button
            onClick={onBackClick}
            disabled={cancelling}
            className="text-sm text-slate-300 hover:text-white underline underline-offset-4 disabled:opacity-60"
          >
            {cancelling ? "Cancelling..." : "Back to Setup"}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          <h2 className="text-lg font-semibold">Room Code</h2>
          <div className="mt-2 text-4xl font-bold text-emerald-400 tracking-wider">
            {roomCode}
          </div>
          <div className="mt-1 text-xs text-slate-400">Share this code with players</div>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          <h2 className="text-lg font-semibold">Connected Players</h2>
          <div className="mt-2">
            {players.length === 0 ? (
              <div className="text-sm text-slate-300">Waiting for players...</div>
            ) : (
              <ul className="space-y-1 text-slate-200">
                {players.map((n, i) => (
                  <li key={i}>• {n}</li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <div className="flex gap-4">
          <button
            onClick={() => navigate("/host/game", { state: { roomCode } })}
            className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            Start Game →
          </button>
          <button
            onClick={onBackClick}
            disabled={cancelling}
            className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-600 disabled:opacity-60"
          >
            {cancelling ? "Cancelling..." : "Back"}
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-rose-900/60 bg-rose-950/40 p-3 text-sm text-rose-100">
            {error}
          </div>
        )}
      </main>
    </div>
  );
}

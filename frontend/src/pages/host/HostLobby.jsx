import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { buildUrl, httpDelete } from "../../api/httpClient";
import { getHostCode } from "../../utils/hostAuth";

function getAvatarUrl(imagePath) {
  if (!imagePath) return "";
  if (imagePath.startsWith("/assets/")) return buildUrl(imagePath);
  if (imagePath.startsWith("http")) return imagePath;
  return buildUrl(`/assets/${imagePath}`);
}

export default function HostLobby() {
  const location = useLocation();
  const navigate = useNavigate();
  const { roomCode } = location.state || {};

  const [players, setPlayers] = useState([]);
  const [playerAvatars, setPlayerAvatars] = useState({});
  const [avatarLoadErrors, setAvatarLoadErrors] = useState({});
  const [jurors, setJurors] = useState([]);
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
          setPlayerAvatars(data.player_avatars || {});
          setJurors(data.jurors || []);
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
    <div className="min-h-screen bg-[#050114] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950 via-[#0a0523] to-[#050114]">
      <header className="sticky top-0 z-40 border-b border-indigo-500/20 bg-[#0a0523]/80 backdrop-blur-md shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-indigo-400/80 mb-0.5">Host View</div>
            <div className="font-bold text-white text-lg tracking-wide bg-gradient-to-r from-indigo-200 to-purple-200 bg-clip-text text-transparent">
              Session Lobby
            </div>
          </div>
          <button
            onClick={onBackClick}
            disabled={cancelling}
            className="text-sm font-semibold text-indigo-300 hover:text-white underline underline-offset-4 disabled:opacity-50 transition-colors"
          >
            {cancelling ? "Cancelling..." : "Back to Setup"}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <section className="rounded-2xl border border-indigo-500/30 bg-indigo-950/20 backdrop-blur-md shadow-[0_0_30px_rgba(139,92,246,0.1)] p-8 text-center relative overflow-hidden group">
          {/* Subtle pulse effect */}
          <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>

          <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-300/80 mb-4">Room Code</h2>
          <div className="inline-block px-10 py-5 rounded-2xl bg-[#0a0523]/60 border border-indigo-500/40 shadow-inner">
            <div className="text-6xl sm:text-7xl font-black text-emerald-400 tracking-[0.2em] font-mono drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]">
              {roomCode}
            </div>
          </div>
          <div className="mt-6 text-sm font-medium text-indigo-200/70">
            Share this code with players to join
          </div>
        </section>

        <section className="rounded-2xl border border-indigo-500/20 bg-indigo-950/30 backdrop-blur-md shadow-inner p-8">
          <div className="flex items-center justify-between mb-6 border-b border-indigo-500/20 pb-4">
            <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              Connected Players
            </h2>
            <span className="px-3 py-1 rounded-full bg-indigo-900/50 border border-indigo-500/30 text-indigo-200 text-sm font-bold">
              {players.length}
            </span>
          </div>

          <div className="min-h-[150px]">
            {players.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-indigo-300/60 font-medium py-10">
                <svg className="animate-spin -ml-1 mr-3 h-8 w-8 text-indigo-500/50 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Waiting for players to join...
              </div>
            ) : (
              <ul className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {players.map((n, i) => (
                  <li key={i} className="bg-[#0a0523]/50 border border-indigo-500/20 rounded-xl px-4 py-3 text-indigo-100 font-medium flex items-center gap-3 shadow-inner">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 p-[2px] shadow-md">
                      <div className="h-full w-full rounded-full bg-[#0a0523] overflow-hidden flex items-center justify-center text-white text-xs font-bold">
                        {getAvatarUrl(playerAvatars[n]) && !avatarLoadErrors[n] ? (
                          <img
                            src={getAvatarUrl(playerAvatars[n])}
                            alt={`${n} avatar`}
                            className="h-full w-full object-cover"
                            onError={() => setAvatarLoadErrors((prev) => ({ ...prev, [n]: true }))}
                          />
                        ) : (
                          n.charAt(0).toUpperCase()
                        )}
                      </div>
                    </div>
                    <span className="truncate">{n}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Jurors section */}
        <section className="rounded-2xl border border-indigo-500/20 bg-indigo-950/30 backdrop-blur-md shadow-inner p-6">
          <div className="flex items-center justify-between mb-4 border-b border-indigo-500/20 pb-3">
            <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
              <span className="text-indigo-400">⚖</span> Jury Seats
            </h2>
            <span className="px-3 py-1 rounded-full bg-indigo-900/50 border border-indigo-500/30 text-indigo-200 text-sm font-bold">
              {jurors.length}
            </span>
          </div>
          {jurors.length === 0 ? (
            <p className="text-sm text-indigo-300/60 text-center py-4">No jurors joined yet — at least 1 required to start</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {jurors.map((n, i) => (
                <li key={i} className="bg-[#0a0523]/50 border border-indigo-500/20 rounded-xl px-3 py-2 text-indigo-100 text-sm font-medium flex items-center gap-2 shadow-inner">
                  <div className="h-6 w-6 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                    {n.charAt(0).toUpperCase()}
                  </div>
                  <span className="truncate">{n}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <div className="flex-1 flex flex-col gap-2">
            <button
              onClick={() => navigate("/host/game", { state: { roomCode } })}
              disabled={jurors.length === 0}
              className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 px-6 py-4 text-base font-bold text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all flex items-center justify-center gap-2"
            >
              Start Game
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            {jurors.length === 0 && (
              <p className="text-center text-xs font-medium text-amber-400/80">At least 1 juror must join before starting</p>
            )}
          </div>
          <button
            onClick={onBackClick}
            disabled={cancelling}
            className="sm:w-1/3 rounded-xl bg-[#0a0523]/60 border border-indigo-500/30 px-6 py-4 text-base font-bold text-indigo-300 hover:bg-indigo-900/60 hover:text-white disabled:opacity-50 active:scale-95 transition-all shadow-inner"
          >
            {cancelling ? "Cancelling..." : "Back"}
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-pink-500/40 bg-pink-950/40 p-4 text-sm font-medium text-pink-200 shadow-[0_0_15px_rgba(236,72,153,0.1)] flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}
      </main>
    </div>
  );
}

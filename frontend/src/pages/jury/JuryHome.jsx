/**
 * JuryHome.jsx
 * Juror join page — mirrors PlayerJoin structure.
 * Juror enters room code + name → POST /join-session → navigate to /jury/vote
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { httpPostJson } from "../../api/httpClient";

export default function JuryHome() {
  const navigate = useNavigate();

  const [roomCode, setRoomCode] = useState("");
  const [jurorName, setJurorName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const canJoin = roomCode.trim().length > 0 && jurorName.trim().length > 0;

  async function onJoin() {
    setBusy(true);
    setError("");

    try {
      const res = await httpPostJson("/join-session", {
        player_type: "juror",
        room_code: roomCode.trim().toUpperCase(),
        player_name: jurorName.trim(),
      });

      if (!res.ok) {
        if (res.status === 404) {
          setError("Room not found. Check the code and try again.");
        } else if (res.status === 400) {
          setError(res.data?.detail || "Game has already started or the session is unavailable.");
        } else {
          setError(`Failed to join (HTTP ${res.status}).`);
        }
        setBusy(false);
        return;
      }

      const sessionData = {
        roomCode: roomCode.trim().toUpperCase(),
        jurorName: jurorName.trim(),
      };
      sessionStorage.setItem("jurorSession", JSON.stringify(sessionData));
      navigate("/jury/vote", { state: sessionData });
    } catch (err) {
      setError(err.message || "Unknown error");
      setBusy(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && canJoin && !busy) onJoin();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-[#0a0523] to-[#0d011c] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-950/20 backdrop-blur-md shadow-[0_0_20px_rgba(139,92,246,0.1)] p-8">
          {/* Title */}
          <div className="text-center">
            <div className="text-4xl mb-3">⚖</div>
            <h1 className="text-3xl font-bold text-white tracking-wide">Jury Panel</h1>
            <p className="mt-2 text-sm text-indigo-200/70 uppercase tracking-widest font-semibold">Join as a Juror</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mt-6 rounded-lg border border-pink-500/40 bg-pink-950/40 p-3 text-sm text-pink-200">
              {error}
            </div>
          )}

          {/* Room Code */}
          <div className="mt-8">
            <label className="block text-xs font-semibold text-indigo-200 uppercase tracking-wider">Room Code</label>
            <input
              type="text"
              placeholder="e.g., ABC1"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
              disabled={busy}
              maxLength={4}
              className="mt-2 w-full rounded-xl border border-indigo-500/30 bg-indigo-950/30 px-4 py-3 text-lg font-semibold tracking-widest text-center text-white outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 disabled:opacity-50 transition-all"
            />
            <p className="mt-2 text-center text-xs text-indigo-300/60">Ask the host for the 4-character code</p>
          </div>

          {/* Juror Name */}
          <div className="mt-6">
            <label className="block text-xs font-semibold text-indigo-200 uppercase tracking-wider">Your Name</label>
            <input
              type="text"
              placeholder="Enter your name"
              value={jurorName}
              onChange={(e) => setJurorName(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={busy}
              maxLength={50}
              className="mt-2 w-full rounded-xl border border-indigo-500/30 bg-indigo-950/30 px-4 py-3 text-white outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 disabled:opacity-50 transition-all"
            />
          </div>

          {/* Join Button */}
          <button
            onClick={onJoin}
            disabled={!canJoin || busy}
            className="mt-8 w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 px-4 py-3 text-base font-bold text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] hover:scale-[1.02] disabled:hover:scale-100 disabled:opacity-50 transition-all"
          >
            {busy ? "Joining..." : "Join as Juror"}
          </button>

          <p className="mt-6 text-center text-xs text-indigo-300/50">
            You'll be taken to the voting screen once the game reaches the jury phase
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * PlayerJoin.jsx
 * Player join page.
 *
 * Purpose:
 * - Players enter a room code (4 chars from host)
 * - Players enter their name
 * - Call backend POST /join-session
 * - On success, navigate to player wait/game view
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { httpPostJson, buildUrl } from "../api/httpClient";

export default function PlayerJoin() {
  const navigate = useNavigate();

  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const canJoin = roomCode.trim().length > 0 && playerName.trim().length > 0;

  async function onJoin() {
    setBusy(true);
    setError("");

    try {
      const res = await httpPostJson("/join-session", {
        room_code: roomCode.trim().toUpperCase(),
        player_name: playerName.trim(),
      });

      if (!res.ok) {
        if (res.status === 404) {
          setError("Room not found. Check the code and try again.");
        } else if (res.status === 400) {
          setError("Game has already started or room is full.");
        } else {
          setError(`Failed to join (HTTP ${res.status}).`);
        }
        setBusy(false);
        return;
      }

      // Success: navigate to player waiting/game view
      navigate("/player/game", { state: { roomCode: roomCode.trim().toUpperCase(), playerName: playerName.trim() } });
    } catch (err) {
      setError(err.message || "Unknown error");
      setBusy(false);
    }
  }

  function handleKeyPress(e) {
    if (e.key === "Enter" && canJoin && !busy) {
      onJoin();
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur p-8">
          {/* Title */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-slate-100">Physics is Phun</h1>
            <p className="mt-2 text-sm text-slate-400">Join a live game</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mt-6 rounded-lg border border-rose-900/60 bg-rose-950/40 p-3 text-sm text-rose-100">
              {error}
            </div>
          )}

          {/* Room Code Input */}
          <div className="mt-6">
            <label className="block text-sm font-semibold text-slate-100">Room Code</label>
            <input
              type="text"
              placeholder="e.g., ABC1"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              onKeyPress={handleKeyPress}
              disabled={busy}
              maxLength={4}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950/40 px-4 py-3 text-lg font-semibold tracking-widest text-center text-slate-100 outline-none focus:ring-2 focus:ring-indigo-600 disabled:opacity-60"
            />
            <p className="mt-1 text-xs text-slate-400">Ask the host for the 4-character code</p>
          </div>

          {/* Player Name Input */}
          <div className="mt-4">
            <label className="block text-sm font-semibold text-slate-100">Your Name</label>
            <input
              type="text"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={busy}
              maxLength={50}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950/40 px-4 py-3 text-slate-100 outline-none focus:ring-2 focus:ring-indigo-600 disabled:opacity-60"
            />
          </div>

          {/* Join Button */}
          <button
            onClick={onJoin}
            disabled={!canJoin || busy}
            className="mt-6 w-full rounded-lg bg-indigo-600 px-4 py-3 text-base font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 transition-colors"
          >
            {busy ? "Joining..." : "Join Game"}
          </button>

          {/* Info */}
          <p className="mt-4 text-center text-xs text-slate-400">
            Your name will be visible to the host and other players
          </p>
        </div>
      </div>
    </div>
  );
}

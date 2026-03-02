/**
 * PlayerGame.jsx
 * Player game view - waiting for questions to appear.
 *
 * Purpose (MVP):
 * - Show that player is connected and waiting
 * - Display player name and room code
 * - Detect if session is cancelled
 * - Will later show questions + timer + answer submission
 */

import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { buildUrl, buildWsUrl } from "../api/httpClient";

// Helper to convert asset paths to full backend URLs
function getImageUrl(imagePath) {
  if (!imagePath) return null;
  if (imagePath.startsWith("/assets/")) return buildUrl(imagePath);
  if (imagePath.startsWith("http")) return imagePath;
  return buildUrl(`/assets/${imagePath}`);
}

export default function PlayerGame() {
  const location = useLocation();
  const navigate = useNavigate();
  const { roomCode, playerName } = location.state || {};

  const [sessionStatus, setSessionStatus] = useState(null);
  const [error, setError] = useState("");
  const [sessionCancelled, setSessionCancelled] = useState(false);
  const [gameFinished, setGameFinished] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(null);
  const wsRef = React.useRef(null);

  // game-specific state
  const [phase, setPhase] = useState("submit"); // submit | choose | results
  const [myFake, setMyFake] = useState("");
  const [answers, setAnswers] = useState([]);
  const [myChoice, setMyChoice] = useState(null);
  const [resultStats, setResultStats] = useState(null);

  // Poll for session updates (players count, status)
  useEffect(() => {
    if (!roomCode) return;

    async function pollSessionStatus() {
      try {
        const res = await fetch(buildUrl(`/session-status/${roomCode}`));
        if (res.ok) {
          const data = await res.json();
          setSessionStatus(data);
          
          // Check if session was cancelled
          if (data.status === "cancelled") {
            setSessionCancelled(true);
          }
        } else if (res.status === 404) {
          // Session not found – probably the backend restarted or the code expired.
          // Send player back to join page so they can try again with a fresh code.
          navigate("/join");
        }
      } catch (err) {
        setError("Lost connection to server");
      }
    }

    pollSessionStatus();
    const interval = setInterval(pollSessionStatus, 2000);
    return () => clearInterval(interval);
  }, [roomCode]);

  // open websocket to receive question updates
  useEffect(() => {
    // only attempt once we know the session still exists (prevent noise when session has vanished)
    if (!roomCode) return;
    if (sessionCancelled) return;

    const wsUrl = buildWsUrl(`/ws/session/${roomCode}`);
    console.log("PlayerGame opening websocket to", wsUrl);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("Player ws opened");
    };

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        console.log("Player ws received", msg);
        if (msg.type === "question") {
          setCurrentQuestionIndex(msg.index);
          setCurrentQuestion(msg.question);
          setSessionStatus((prev) => ({ ...(prev || {}), status: "in-progress" }));
          // reset game-phase state
          setPhase("submit");
          setMyFake("");
          setAnswers([]);
          setMyChoice(null);
          setResultStats(null);
        } else if (msg.type === "cancelled") {
          setSessionCancelled(true);
        } else if (msg.type === "game_finished") {
          setGameFinished(true);
        } else if (msg.type === "answers") {
          setAnswers(msg.answers || []);
          setPhase("choose");
        } else if (msg.type === "results") {
          setResultStats(msg.stats || {});
          setPhase("results");
        }
      } catch (e) {
        console.error("Invalid ws msg", e);
      }
    };

    ws.onclose = (e) => console.log("Player ws closed", e.code, e.reason);
    ws.onerror = (e) => console.error("Player ws error", e);

    return () => {
      console.log("Player ws cleanup - closing socket");
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [roomCode, sessionCancelled]);

  if (!roomCode || !playerName) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 text-center">
          <p className="text-slate-300">Error: Session information not found.</p>
        </div>
      </div>
    );
  }

  // Show session cancelled message
  if (sessionCancelled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-950 flex items-center justify-center p-6">
        <div className="rounded-xl border border-rose-900/60 bg-rose-950/40 p-8 max-w-md text-center">
          <h2 className="text-xl font-semibold text-rose-100 mb-2">Session Cancelled</h2>
          <p className="text-sm text-rose-200 mb-6">
            The host has cancelled the game session. Please try joining another session.
          </p>
          <button
            onClick={() => navigate("/join")}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            Return to Join Page
          </button>
        </div>
      </div>
    );
  }

  // Show game finished message
  if (gameFinished) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-950 flex items-center justify-center p-6">
        <div className="rounded-xl border border-emerald-900/60 bg-emerald-950/40 p-8 max-w-md text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-2xl font-semibold text-emerald-100 mb-2">Game Finished!</h2>
          <p className="text-sm text-emerald-200 mb-6">
            Thank you for playing. The host has finished all questions.
          </p>
          <button
            onClick={() => navigate("/join")}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            Return to Join Page
          </button>
        </div>
      </div>
    );
  }

  // if we have received a question from host, display it
  if (currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-950">
        <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0">
          <div className="mx-auto max-w-2xl px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-400">Room Code</div>
                <div className="text-2xl font-bold text-emerald-400">{roomCode}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-slate-400">Your Name</div>
                <div className="text-lg font-semibold text-slate-100">{playerName}</div>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-2xl px-4 py-8">
          {sessionStatus && (
            <div className="mb-6 rounded-lg bg-slate-950/50 p-4 text-sm text-slate-300">
              <div>Status: {sessionStatus.status}</div>
              <div>Players Connected: {sessionStatus.players.length}</div>
            </div>
          )}

          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-8 text-center">
            <div className="text-sm text-slate-400 mb-2">Question</div>
            <h2 className="text-2xl font-semibold text-slate-100 mb-4">
              {currentQuestion.Question_Text}
            </h2>
            {currentQuestion.Image_Link && (
              <div className="mb-4">
                <img
                  src={getImageUrl(currentQuestion.Image_Link)}
                  alt="Question"
                  className="mx-auto max-h-64 object-contain"
                />
              </div>
            )}

            <div className="mt-4 text-xs text-slate-400">
              Question {currentQuestionIndex + 1}
            </div>

            {/* phase-specific interaction */}
            {phase === "submit" && (
              <div className="mt-6">
                <input
                  type="text"
                  placeholder="Your fake answer"
                  value={myFake}
                  onChange={(e) => setMyFake(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-4 py-3 text-slate-100 outline-none focus:ring-2 focus:ring-indigo-600"
                />
                <button
                  onClick={async () => {
                    if (!myFake) return;
                    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                      wsRef.current.send(JSON.stringify({
                        type: "fake",
                        player: playerName,
                        text: myFake,
                      }));
                    }
                    setPhase("waiting");
                  }}
                  disabled={!myFake}
                  className="mt-4 w-full rounded-lg bg-indigo-600 px-4 py-3 text-base font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
                >
                  Submit Fake
                </button>
              </div>
            )}

            {phase === "waiting" && (
              <div className="mt-6 text-slate-300">Waiting for other players / host...</div>
            )}
            {phase === "choose" && (
              <div className="mt-6 space-y-3">
                {answers.map((ans, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setMyChoice(ans);
                      wsRef.current && wsRef.current.readyState === WebSocket.OPEN &&
                        wsRef.current.send(JSON.stringify({
                          type: "choice",
                          player: playerName,
                          answer: ans,
                        }));
                    }}
                    disabled={!!myChoice}
                    className="w-full rounded-lg border border-slate-700 px-4 py-3 text-slate-100 hover:bg-slate-800 disabled:opacity-60"
                  >
                    {ans}
                  </button>
                ))}
              </div>
            )}

            {phase === "results" && resultStats && (
              <div className="mt-6 space-y-2 text-left text-slate-100">
                <div className="font-semibold">Results:</div>
                {Object.entries(resultStats).map(([ans,count]) => (
                  <div key={ans} className="flex justify-between">
                    <span>{ans}</span>
                    <span>{count} vote{count!==1?"s":""}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0">
        <div className="mx-auto max-w-2xl px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-400">Room Code</div>
              <div className="text-2xl font-bold text-emerald-400">{roomCode}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-400">Your Name</div>
              <div className="text-lg font-semibold text-slate-100">{playerName}</div>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-2xl px-4 py-8">
        {error && (
          <div className="rounded-lg border border-rose-900/60 bg-rose-950/40 p-4 text-sm text-rose-100">
            {error}
          </div>
        )}

        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-8 text-center">
          <div className="text-sm text-slate-400 mb-2">Waiting for the host...</div>
          <h2 className="text-2xl font-semibold text-slate-100">Questions Coming Soon</h2>

          {sessionStatus && (
            <div className="mt-6 rounded-lg bg-slate-950/50 p-4 text-sm text-slate-300">
              <div>Status: {sessionStatus.status}</div>
              <div>Players Connected: {sessionStatus.players.length}</div>
            </div>
          )}

          <div className="mt-8">
            <div className="inline-block">
              <div className="text-sm text-slate-400 mb-2">Connection Status</div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-slate-200">Connected</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

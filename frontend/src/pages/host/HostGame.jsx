/**
 * HostGame.jsx
 * Host Game View - Display questions to the host
 *
 * Purpose (MVP):
 * - Show current question being displayed to players
 * - Navigate through questions with next/previous buttons
 * - Later: add timers, show player answers, tally scores, jury view
 */

import React, { useEffect, useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDeck } from "../../state/DeckContext.jsx";
import { buildUrl, buildWsUrl } from "../../api/httpClient";
import { getHostCode } from "../../utils/hostAuth";

// Helper to convert asset paths to full backend URLs
function getImageUrl(imagePath) {
  if (!imagePath) return null;
  if (imagePath.startsWith("/assets/")) return buildUrl(imagePath);
  if (imagePath.startsWith("http")) return imagePath;
  return buildUrl(`/assets/${imagePath}`);
}

export default function HostGame() {
  const location = useLocation();
  const navigate = useNavigate();
  const { roomCode } = location.state || {};
  const { activeDeck } = useDeck();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [wsConnected, setWsConnected] = useState(false);
  const [phase, setPhase] = useState("collecting"); // collecting | answers | results
  const [submissions, setSubmissions] = useState([]); // list of player names
  const [answerPool, setAnswerPool] = useState([]);
  const [resultStats, setResultStats] = useState(null);
  const wsRef = React.useRef(null);

  // If no deck or room code, redirect
  useEffect(() => {
    if (!activeDeck) {
      navigate("/host");
      return;
    }
    if (!roomCode) {
      navigate("/host/lobby");
      return;
    }
  }, [activeDeck, roomCode, navigate]);

  // establish websocket connection for real-time question broadcasting
  useEffect(() => {
    if (!roomCode) return;
    // use helper that picks up current host from window.location
    const wsUrl = buildWsUrl(`/ws/session/${roomCode}`);
    console.log("HostGame opening websocket to", wsUrl);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("Host websocket connected");
      setWsConnected(true);
    };
    ws.onclose = () => console.log("Host websocket closed");
    ws.onmessage = (evt) => {
      console.log("Host received ws message", evt.data);
      try {
        const msg = JSON.parse(evt.data);
        if (msg.type === "submission") {
          // someone submitted fake answer
          setSubmissions((prev) => [...prev, msg.player]);
        } else if (msg.type === "answers") {
          // save answer pool and switch phase
          setAnswerPool(msg.answers || []);
          setPhase("answers");
        } else if (msg.type === "results") {
          setResultStats(msg.stats);
          setPhase("results");
        }
      } catch (e) {
        // ignore
      }
    };

    return () => {
      if (wsRef.current) wsRef.current.close();
      wsRef.current = null;
    };
  }, [roomCode]);

  if (!activeDeck || !roomCode) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-300">Loading...</div>
      </div>
    );
  }

  const questions = activeDeck.questions || [];
  const totalQuestions = questions.length;
  const isFirstQuestion = currentQuestionIndex === 0;
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;

  const currentQuestion = questions[currentQuestionIndex] || {};

  // helper that sends the current question over the socket (if available)
  function sendCurrentQuestion() {
    if (
      wsRef.current &&
      wsRef.current.readyState === WebSocket.OPEN
    ) {
      wsRef.current.send(
        JSON.stringify({
          type: "question",
          index: currentQuestionIndex,
          question: currentQuestion,
        })
      );
    }
  }

  // whenever question index changes we reset phase/submissions/stats
  useEffect(() => {
    setPhase("collecting");
    setSubmissions([]);
    setAnswerPool([]);
    setResultStats(null);
    if (wsConnected) {
      sendCurrentQuestion();
    }
  }, [currentQuestionIndex, currentQuestion, wsConnected]);

  function goToPrevious() {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  }

  function goToNext() {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  }

  function broadcastAnswers() {
    // compile answers: correct, predefined fake, plus submitted fakes
    const answerSet = [];
    if (currentQuestion.Correct_Answer) answerSet.push(currentQuestion.Correct_Answer);
    if (currentQuestion.Predefined_Fake) answerSet.push(currentQuestion.Predefined_Fake);
    // submissions contain names only; server stores text – but host doesn't have those texts yet.
    // We'll rely on server to keep them but we don't display them here.
    // Send placeholder; players will combine correct/predefined and fakes locally
    wsRef.current.send(JSON.stringify({ type: "answers", answers: answerSet }));
    setPhase("answers");
  }

  function requestResults() {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "results_request" }));
    }
  }

  async function onEndGame() {
    // Broadcast game finished message to all players via websocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "game_finished",
        })
      );
    }
    // Navigate to leaderboard
    navigate("/host/leaderboard", { state: { roomCode } });
  }

  async function onExitGame() {
    // cancel session on backend so players are notified
    try {
      const hostCode = getHostCode?.() || "";
      const headers = hostCode ? { "X-Host-Code": hostCode } : {};
      await fetch(buildUrl(`/session/${roomCode}`), { method: "DELETE", headers });
    } catch (e) {
      console.warn("Failed to cancel session", e);
    }
    navigate("/host");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-950">
      {/* Header */}
      <header className="sticky top-0 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div>
            <div className="text-sm text-slate-400">Host View</div>
            <div className="font-semibold">Game in Progress</div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-300">
              Room: <span className="font-semibold text-emerald-400">{roomCode}</span>
            </div>
            <button
              onClick={onExitGame}
              className="text-sm text-slate-300 hover:text-white underline underline-offset-4"
            >
              Exit Game
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        {/* Question Counter */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-400">Question Progress</div>
              <div className="mt-1 text-2xl font-semibold">
                {currentQuestionIndex + 1} of {totalQuestions}
              </div>
            </div>
            <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 transition-all duration-300"
                style={{
                  width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%`,
                }}
              />
            </div>
          </div>
        </section>

        {/* Question Display */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-8">
          {/* Question Text */}
          <div className="mb-6">
            <div className="text-sm text-slate-400 mb-2">Question Text</div>
            <div className="text-2xl font-semibold text-slate-100">
              {currentQuestion.Question_Text || "(No question text)"}
            </div>
          </div>

          {/* Question Image (if present) */}
          {currentQuestion.Image_Link && (
            <div className="mb-6 rounded-lg overflow-hidden border border-slate-700">
              <img
                src={getImageUrl(currentQuestion.Image_Link)}
                alt="Question"
                className="w-full max-h-96 object-contain bg-slate-950"
              />
            </div>
          )}

          {/* Correct Answer */}
          {phase === "results" && (
            <div className="mb-4 rounded-lg border border-emerald-900/50 bg-emerald-950/30 p-4">
              <div className="text-xs text-emerald-400 font-semibold mb-1">CORRECT ANSWER</div>
              <div className="text-lg text-emerald-200">
                {currentQuestion.Correct_Answer || "(No answer)"}
              </div>
            </div>
          )}

          {/* Predefined Fake */}
          {phase === "results" && (
            <div className="rounded-lg border border-rose-900/50 bg-rose-950/30 p-4">
              <div className="text-xs text-rose-400 font-semibold mb-1">PREDEFINED FAKE</div>
              <div className="text-lg text-rose-200">
                {currentQuestion.Predefined_Fake || "(No fake answer)"}
              </div>
            </div>
          )}
        </section>

        {/* Navigation Controls (phase‑aware) */}
        <section className="flex gap-4">
          <button
            onClick={goToPrevious}
            disabled={isFirstQuestion || phase !== "collecting"}
            className="flex-1 rounded-lg bg-slate-700 px-4 py-3 text-sm font-semibold text-slate-100 hover:bg-slate-600 disabled:opacity-40"
          >
            ← Previous
          </button>

          {phase === "collecting" && (
            <button
              onClick={broadcastAnswers}
              className="flex-1 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              Show Answers ({submissions.length} submitted)
            </button>
          )}

          {phase === "answers" && (
            <button
              onClick={requestResults}
              className="flex-1 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-500"
            >
              Show Results
            </button>
          )}

          {phase === "results" && (
            <button
              onClick={isLastQuestion ? onEndGame : goToNext}
              className="flex-1 rounded-lg px-4 py-3 text-sm font-semibold text-slate-100 transition-colors"
              style={{
                backgroundColor: isLastQuestion ? "rgb(34, 197, 94)" : "rgb(51, 65, 85)",
              }}
            >
              {isLastQuestion ? "🏁 End Game" : "Next →"}
            </button>
          )}

          <button
            onClick={onExitGame}
            className="flex-1 rounded-lg bg-rose-700 px-4 py-3 text-sm font-semibold text-slate-100 hover:bg-rose-600"
          >
            Exit
          </button>
        </section>

        {/* Phase-specific information */}
        {phase === "collecting" && (
          <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
            <div className="text-sm text-slate-300">
              Waiting for players to submit fakes ({submissions.length})
            </div>
          </section>
        )}
        {phase === "answers" && (
          <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
            <div className="text-sm font-semibold text-slate-200 mb-2">Answers being shown</div>
            <ul className="list-disc list-inside text-slate-300">
              {answerPool.map((ans, i) => (
                <li key={i}>{ans}</li>
              ))}
            </ul>
          </section>
        )}
        {phase === "results" && resultStats && (
          <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
            <div className="text-sm font-semibold text-slate-200 mb-2">Results</div>
            <ul className="list-disc list-inside text-slate-300">
              {Object.entries(resultStats).map(([ans,count]) => (
                <li key={ans}>{ans}: {count}</li>
              ))}
            </ul>
          </section>
        )}

        {/* Info Section */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-3">Deck & Timer Info (Coming Soon)</h3>
          <div className="space-y-2 text-sm text-slate-300">
            <div>Deck: {activeDeck.name}</div>
            <div>Room Code: {roomCode}</div>
            <div className="mt-2 text-xs text-slate-400">
              ℹ️ Timers and answer tallying will be implemented next
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

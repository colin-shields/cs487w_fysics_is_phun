// frontend/src/App.jsx
// Routing + Host protection via RequireHostAuth (Host must log in first)

import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import HostHome from "./pages/host/HostHome.jsx";
import HostDecks from "./pages/host/HostDecks.jsx";
import HostSessionSetup from "./pages/host/HostSessionSetup.jsx";
import HostLogin from "./pages/host/HostLogin.jsx";
import JuryHome from "./pages/host/Jury/JuryHome.jsx";
import HostLobby from "./pages/host/HostLobby.jsx";
import HostGame from "./pages/host/HostGame.jsx";
import HostLeaderboard from "./pages/host/HostLeaderboard.jsx";
import PlayerJoin from "./pages/PlayerJoin.jsx";
import PlayerGame from "./pages/PlayerGame.jsx";

import RequireHostAuth from "./components/auth/RequireHostAuth.jsx";

// Placeholders (not implemented yet)
const ComingSoon = ({ title }) => (
  <div className="min-h-screen flex items-center justify-center p-6">
    <div className="max-w-lg w-full rounded-xl border border-slate-800 bg-slate-900/40 p-6">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="mt-2 text-slate-300">This area will be implemented later.</p>
    </div>
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default route goes to Host Login (guard will redirect anyway) */}
        <Route path="/" element={<Navigate to="/host" replace />} />

        {/* Host Login (UNPROTECTED) */}
        <Route path="/host/login" element={<HostLogin />} />

        {/* Host experience (PROTECTED) */}
        <Route element={<RequireHostAuth />}>
          <Route path="/host" element={<HostHome />} />
          <Route path="/host/decks" element={<HostDecks />} />
          <Route path="/host/session" element={<HostSessionSetup />} />
          <Route path="/host/lobby" element={<HostLobby />} />
          <Route path="/host/game" element={<HostGame />} />
          <Route path="/host/leaderboard" element={<HostLeaderboard />} />
        </Route>

        {/* Future experiences */}
        <Route path="/join" element={<PlayerJoin />} />
        <Route path="/player/game" element={<PlayerGame />} />
        <Route path="/jury" element={<JuryHome title="Jury Home" />} />

        {/* Fallback */}
        <Route path="*" element={<ComingSoon title="404 — Page Not Found" />} />
      </Routes>
    </BrowserRouter>
  );
}

// frontend/src/App.jsx
// For Step 1, we set up routing so Host can be built first,
// while keeping clean placeholders for Player/Jury later.

import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import HostDecks from "./pages/host/HostDecks.jsx";
import HostSessionSetup from "./pages/host/HostSessionSetup.jsx";
import HostHome from "./pages/host/HostHome.jsx";

// Placeholders (not implemented yet)
const ComingSoon = ({ title }) => (
  <div className="min-h-screen flex items-center justify-center p-6">
    <div className="max-w-lg w-full rounded-xl border border-slate-800 bg-slate-900/40 p-6">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="mt-2 text-slate-300">
        This area will be implemented later.
      </p>
    </div>
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default route goes to Host, since Host UI is the current focus */}
        <Route path="/" element={<Navigate to="/host" replace />} />

        {/* Host experience */}
        <Route path="/host" element={<HostHome />} />
        <Route path="/host/decks" element={<HostDecks />} />
        <Route path="/host/session" element={<HostSessionSetup />} />


        {/* Future experiences */}
        <Route path="/join" element={<ComingSoon title="Join (Player/Jury) — Coming Soon" />} />
        <Route path="/player/*" element={<ComingSoon title="Player UI — Coming Soon" />} />
        <Route path="/jury/*" element={<ComingSoon title="Jury UI — Coming Soon" />} />

        {/* Fallback */}
        <Route path="*" element={<ComingSoon title="404 — Page Not Found" />} />
      </Routes>
    </BrowserRouter>
  );
}

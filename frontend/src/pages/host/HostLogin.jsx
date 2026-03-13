import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { setHostCode } from "../../utils/hostAuth";
import { verifyHostCode } from "../../api/host";

export default function HostLogin() {
  const navigate = useNavigate();
  const [hostCode, setHostCodeInput] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");

    const codeClean = hostCode.trim();
    if (!codeClean) {
      setError("Please enter the Host Code.");
      return;
    }


    setBusy(true);
    const res = await verifyHostCode(codeClean);
    setBusy(false);

    if (!res.ok) {
      setError("Invalid host code.");
      return;
    }

    // Only save code AFTER backend confirms it
    setHostCode(codeClean);
    navigate("/host", { replace: true });
  }



  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-[#0a0523] to-[#0d011c] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="absolute top-6 left-6 z-10">
        <Link
          className="text-xs font-semibold uppercase tracking-wider text-indigo-300 hover:text-white transition-colors flex items-center gap-2"
          to="/jury"
        >
          <span className="text-lg">←</span> Go to Jury Home
        </Link>
      </div>

      <div className="w-full max-w-md rounded-2xl border border-indigo-500/20 bg-indigo-950/20 backdrop-blur-md shadow-[0_0_30px_rgba(139,92,246,0.1)] p-8 relative z-10 relative overflow-hidden">
        {/* Subtle top border glow */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50"></div>

        <div className="text-xs font-semibold uppercase tracking-widest text-indigo-300/70 mb-2">Host View</div>
        <h1 className="text-3xl font-bold text-white tracking-wide">Host Login</h1>
        <p className="mt-2 text-sm text-indigo-200/80">
          Enter the Host Code to access Host pages.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-6">
          <div>
            <label className="block text-xs font-semibold text-indigo-200 uppercase tracking-wider mb-2">
              Host Code
            </label>
            <input
              value={hostCode}
              onChange={(e) => setHostCodeInput(e.target.value)}
              className="w-full rounded-xl border border-indigo-500/30 bg-indigo-950/30 px-4 py-3 text-white placeholder:text-indigo-400/50 outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all shadow-inner"
              placeholder="Enter host code"
              autoComplete="off"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-pink-500/40 bg-pink-950/40 p-4 text-sm text-pink-200 shadow-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3.5 text-base font-bold text-white shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:shadow-[0_0_25px_rgba(139,92,246,0.5)] hover:scale-[1.02] disabled:hover:scale-100 disabled:opacity-50 transition-all"
          >
            {busy ? "Authenticating..." : "Continue"}
          </button>

          <p className="text-xs text-center text-indigo-300/50 mt-4 leading-relaxed">
            If the code is wrong, protected actions will return 401 until corrected.
          </p>
        </form>
      </div>
    </div>
  );
}

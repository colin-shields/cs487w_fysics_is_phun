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
    
    <div className="min-h-screen flex items-center justify-center px-4">
        <div className="absolute top-4 left-4">
                  <Link
                    className="text-sm text-slate-300 hover:text-white underline underline-offset-4"
                    to="/jury"
                  >
                    Go to Jury Home
                  </Link>
        </div>
      <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900/40 p-6">
        <div className="text-sm text-slate-400">Host View</div>
        <h1 className="mt-1 text-xl font-semibold">Host Login</h1>
        <p className="mt-2 text-sm text-slate-300">
          Enter the Host Code to access Host pages.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <label className="block text-sm font-semibold text-slate-200">
            Host Code
            <input
              value={hostCode}
              onChange={(e) => setHostCodeInput(e.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-slate-100 placeholder:text-slate-500"
              placeholder="Enter host code"
              autoComplete="off"
            />
          </label>

          {error && (
            <div className="rounded-lg border border-rose-900/60 bg-rose-950/40 p-3 text-sm text-rose-100">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            Continue
          </button>

          <p className="text-xs text-slate-400">
            If the code is wrong, protected actions will return 401 until corrected.
          </p>
        </form>
      </div>
    </div>
  );
}

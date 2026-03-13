import React from "react";

// The "default" keyword is required here
export default function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0523]/80 backdrop-blur-sm">
      <div className="w-full max-w-6xl max-h-[80vh] overflow-hidden flex flex-col rounded-2xl border border-indigo-500/30 bg-indigo-950/40 backdrop-blur-md shadow-[0_0_40px_rgba(139,92,246,0.15)] relative m-4">
        {/* Subtle top border glow */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50"></div>

        <div className="flex items-center justify-between border-b border-indigo-500/20 bg-[#0a0523]/60 px-6 py-4 relative z-10 shrink-0">
          <h2 className="text-xl font-bold text-white tracking-wide">{title}</h2>
          <button
            onClick={onClose}
            className="text-indigo-400 hover:text-white transition-colors text-3xl leading-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10"
          >
            &times;
          </button>
        </div>
        <div className="overflow-y-auto p-6 relative z-10">
          {children}
        </div>
      </div>
    </div>
  );
}
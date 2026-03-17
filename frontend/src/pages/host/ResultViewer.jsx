import React from "react";

const ResultViewer = ({ data }) => {
  // data.rows[0] is the Question Text Header
  // data.rows[1] is the sub-labels (Submitted, Chose, etc.)
  // data.rows[2] to [n-1] are the Player Rows

  const questionHeaders = data.rows[0].filter((h) => h.startsWith("Q"));
  const playerRows = data.rows.slice(2, -1);

  return (
    <div className="space-y-4 w-full mx-auto">
      <h2 className="text-2xl font-bold text-white mb-6">
        Round-by-Round Breakdown
      </h2>

      {questionHeaders.map((qText, qIdx) => {
        // baseIdx helps us find the 4 columns (Sub, Chose, Fooled, Pts) for this specific Q
        const baseIdx = 1 + qIdx * 4;

        return (
          <details
            key={qIdx}
            className="group bg-slate-800/50 rounded-lg overflow-hidden border border-slate-700/50"
          >
            <summary className="flex justify-between items-center p-4 cursor-pointer hover:bg-slate-700/50 transition-colors">
              <span className="text-lg font-semibold text-indigo-300 break-words pr-4 text-left">
                {qText}
              </span>
              <span className="text-slate-400 group-open:rotate-180 transform transition-transform shrink-0">
                ▼
              </span>
            </summary>

            <div className="p-4 bg-slate-900/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {playerRows.map((playerData, pIdx) => (
                  <div
                    key={pIdx}
                    className="p-4 border border-slate-700/50 rounded-xl bg-slate-800/80 shadow-sm"
                  >
                    <div className="text-blue-400 font-bold text-lg mb-3 border-b border-slate-700 pb-1">
                      {playerData[0]}
                    </div>

                    <div className="space-y-2 text-sm text-white">
                      <div className="flex flex-col sm:flex-row sm:gap-2">
                        <span className="text-slate-500 font-medium">
                          Submitted:
                        </span>
                        <span className="break-words">
                          {playerData[baseIdx] || "Nothing"}
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:gap-2">
                        <span className="text-slate-500 font-medium">
                          Chose:
                        </span>
                        <span className="break-words">
                          {playerData[baseIdx + 1] || "Nobody"}
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:gap-2">
                        <span className="text-slate-500 font-medium">
                          Fooled:
                        </span>
                        <span className="break-words">
                          {playerData[baseIdx + 2] || "Nobody"}
                        </span>
                      </div>

                      <div className="pt-2 flex flex-col sm:flex-row sm:gap-2 font-semibold">
                        <span className="text-slate-500">Points:</span>
                        <span>{playerData[baseIdx + 3]}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </details>
        );
      })}
    </div>
  );
};

export default ResultViewer;

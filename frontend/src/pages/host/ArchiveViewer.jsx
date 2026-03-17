import React, { useState } from "react";
import ResultViewer from "./ResultViewer";

export default function ArchiveViewer() {
  const [fileData, setFileData] = useState(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const rows = text.split("\n").map((row) => {
        // Simple CSV split (note: doesn't handle commas inside quotes perfectly,
        // but works for quick viewing)
        return row.split(",").map((cell) => cell.replace(/^"|"$/g, ""));
      });
      setFileData({ rows });
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      {!fileData ? (
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-700 p-20 rounded-2xl">
          <h1 className="text-3xl font-bold mb-4">Upload Past Game Summary</h1>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>
      ) : (
        <div>
          <button
            onClick={() => setFileData(null)}
            className="mb-4 text-blue-400 hover:underline"
          >
            ← Upload another
          </button>
          <ResultViewer data={fileData} />
        </div>
      )}
    </div>
  );
}

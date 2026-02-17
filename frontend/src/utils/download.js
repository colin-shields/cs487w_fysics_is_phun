/**
 * download.js
 * Small utility for downloading text content as a file in the browser.
 * We will reuse this later for: CSV template download and (eventually) export files.
 */

/**
 * Trigger download of a text file.
 * @param {string} filename e.g. "deck_template.csv"
 * @param {string} content raw text content
 * @param {string} mimeType e.g. "text/csv"
 */
export function downloadTextFile(filename, content, mimeType = "text/plain") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();

  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * DeckContext.jsx
 * Global deck state for the Host UI.
 *
 * Persistence:
 * - Stores the active deck in localStorage so it survives refresh/reopen.
 * - Keeps simple versioning so we can change structure later safely.
 *
 * NOTE:
 * - localStorage has size limits. For very large decks, we may need a different approach.
 * - For MVP (6–30 questions), this is typically fine.
 */

import React, { createContext, useContext, useMemo, useState } from "react";

const DeckContext = createContext(null);

const STORAGE_KEY = "fip_active_deck_v1";

/**
 * Very small validation so bad localStorage content doesn't crash the app.
 */
function isValidActiveDeck(obj) {
  if (!obj || typeof obj !== "object") return false;
  if (typeof obj.name !== "string") return false;
  if (!Array.isArray(obj.questions)) return false;
  if (typeof obj.uploadedAt !== "number") return false;
  return true;
}

function loadDeckFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isValidActiveDeck(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function saveDeckToStorage(activeDeck) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(activeDeck));
  } catch {
    // If storage is full or blocked, we silently fail (app still works in-memory).
  }
}

function clearDeckFromStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // no-op
  }
}

export function DeckProvider({ children }) {
  // Load once on initial mount
  const [activeDeck, setActiveDeckState] = useState(() => loadDeckFromStorage());

  /**
   * Set active deck and persist.
   */
  function setActiveDeck(deck) {
    setActiveDeckState(deck);
    saveDeckToStorage(deck);
  }

  /**
   * Clear active deck and remove from storage.
   */
  function clearActiveDeck() {
    setActiveDeckState(null);
    clearDeckFromStorage();
  }

  const value = useMemo(
    () => ({
      activeDeck,
      setActiveDeck,
      clearActiveDeck,
    }),
    [activeDeck]
  );

  return <DeckContext.Provider value={value}>{children}</DeckContext.Provider>;
}

export function useDeck() {
  const ctx = useContext(DeckContext);
  if (!ctx) throw new Error("useDeck must be used inside <DeckProvider>");
  return ctx;
}

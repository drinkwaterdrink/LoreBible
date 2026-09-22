import type { UiMode } from "./types";

export const UI_MODE_STORAGE_KEY = "lorebible_ui_mode_v1";

function getStorage(): Storage | null {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage;
  }
  if (typeof localStorage !== "undefined") {
    return localStorage;
  }
  return null;
}

/**
 * Reads the stored UI mode preference safely from localStorage.
 * Defaults to "adventure_journal" on this branch.
 */
export function getStoredUiMode(): UiMode {
  const storage = getStorage();
  if (!storage) {
    return "adventure_journal";
  }
  try {
    const raw = storage.getItem(UI_MODE_STORAGE_KEY);
    if (raw === "classic" || raw === "adventure_journal") {
      return raw;
    }
    return "adventure_journal";
  } catch {
    return "adventure_journal";
  }
}

/**
 * Persists the user's UI mode preference.
 */
export function setStoredUiMode(mode: UiMode): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  try {
    storage.setItem(UI_MODE_STORAGE_KEY, mode);
  } catch (err) {
    console.warn("[UiMode] Unable to persist UI preference:", err);
  }
}

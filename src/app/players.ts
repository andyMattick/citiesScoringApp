const SAVED_PLAYER_NAMES_STORAGE_KEY = "game-player-names-v1";
const MAX_SAVED_NAMES = 50;

/**
 * Load all saved player names from localStorage
 */
export function loadSavedPlayerNames(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(SAVED_PLAYER_NAMES_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((name): name is string => typeof name === "string" && name.trim().length > 0);
  } catch {
    return [];
  }
}

/**
 * Save player names to localStorage, merging with existing names
 */
export function savePlayerNames(names: string[]): void {
  if (typeof window === "undefined") {
    return;
  }

  const existing = loadSavedPlayerNames();
  // Merge new names with existing, keeping unique names
  const merged = Array.from(
    new Set([...existing, ...names.map((name) => name.trim())])
  )
    .filter(Boolean)
    .slice(0, MAX_SAVED_NAMES); // Keep only the most recent names

  window.localStorage.setItem(SAVED_PLAYER_NAMES_STORAGE_KEY, JSON.stringify(merged));
}

/**
 * Add a single player name to saved names
 */
export function addPlayerName(name: string): void {
  const trimmed = name.trim();
  if (!trimmed) {
    return;
  }

  const existing = loadSavedPlayerNames();
  const merged = Array.from(new Set([trimmed, ...existing]))
    .slice(0, MAX_SAVED_NAMES);

  window.localStorage.setItem(SAVED_PLAYER_NAMES_STORAGE_KEY, JSON.stringify(merged));
}

/**
 * Delete a player name from saved names
 */
export function deletePlayerName(name: string): void {
  const existing = loadSavedPlayerNames();
  const filtered = existing.filter((n) => n !== name);
  window.localStorage.setItem(SAVED_PLAYER_NAMES_STORAGE_KEY, JSON.stringify(filtered));
}

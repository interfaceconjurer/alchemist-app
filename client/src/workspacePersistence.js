const STORAGE_KEY = 'workspace-state';
const API_URL = '/api/workspace-state';

/**
 * Load persisted workspace state.
 * Tries the server first; falls back to localStorage.
 */
export async function loadState() {
  try {
    const res = await fetch(API_URL);
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return data;
    }
    throw new Error(`Server returned ${res.status}`);
  } catch (err) {
    console.warn('Server state unavailable, falling back to localStorage:', err.message);
    return loadFromLocalStorage();
  }
}

function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // corrupted data
  }
  return { openTabIds: [], activeTabId: null, leftPanelWidth: 280 };
}

/**
 * Save workspace state to server and localStorage.
 */
export async function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

  try {
    await fetch(API_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    });
  } catch (err) {
    console.warn('Failed to save state to server:', err.message);
  }
}

/**
 * Creates a debounced save with a flush() for beforeunload.
 */
export function createDebouncedSave(delayMs = 500) {
  let timeoutId = null;
  let latestState = null;

  function debouncedSave(state) {
    latestState = state;
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      timeoutId = null;
      saveState(state);
    }, delayMs);
  }

  function flush() {
    if (latestState === null) return;
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(latestState));
    const blob = new Blob([JSON.stringify(latestState)], { type: 'application/json' });
    navigator.sendBeacon(API_URL, blob);
    latestState = null;
  }

  return { debouncedSave, flush };
}

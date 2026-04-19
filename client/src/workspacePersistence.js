const STORAGE_KEY = 'workspace-state';

const EMPTY_STATE = { openTabIds: [], activeTabId: null };

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return Promise.resolve(JSON.parse(raw));
  } catch {
    // corrupted data
  }
  return Promise.resolve(EMPTY_STATE);
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function createDebouncedSave(delayMs = 500) {
  let timeoutId = null;
  let latestState = null;

  function debouncedSave(state) {
    latestState = state;
    if (timeoutId !== null) clearTimeout(timeoutId);
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
    saveState(latestState);
    latestState = null;
  }

  return { debouncedSave, flush };
}

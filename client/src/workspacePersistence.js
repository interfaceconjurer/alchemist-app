import { LEFT_PANEL_DEFAULT_WIDTH, LEFT_PANEL_MIN_WIDTH, normalizeSplitView } from './utils/stateHelpers';
import { readStorage, writeStorage } from './utils/safeStorage';

const STORAGE_KEY = 'workspace-state';
const VERSION = 1;
const MAX_TABS = 100;
const MAX_STORAGE_LENGTH = 64 * 1024;
const VALID_ID = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/;

export function normalizeWorkspaceState(value) {
  // Unversioned records are the previous format; unknown future schemas reset.
  const source = value && typeof value === 'object' && !Array.isArray(value)
    && (value.version === undefined || value.version === VERSION) ? value : {};
  const openTabIds = [...new Set((Array.isArray(source.openTabIds) ? source.openTabIds : [])
    .slice(0, MAX_TABS).filter(id => typeof id === 'string' && VALID_ID.test(id)))];
  const splitView = normalizeSplitView(source.splitView, openTabIds);
  return {
    version: VERSION,
    openTabIds,
    activeTabId: splitView.enabled
      ? splitView[splitView.activePaneId === 'left' ? 'leftActiveTabId' : 'rightActiveTabId']
      : openTabIds.includes(source.activeTabId) ? source.activeTabId : openTabIds.at(-1) ?? null,
    previewTabId: openTabIds.includes(source.previewTabId) ? source.previewTabId : null,
    leftPanelWidth: Number.isFinite(source.leftPanelWidth)
      ? Math.max(LEFT_PANEL_MIN_WIDTH, Math.min(4096, source.leftPanelWidth)) : LEFT_PANEL_DEFAULT_WIDTH,
    splitView,
  };
}

export function loadState() {
  try {
    const raw = readStorage(STORAGE_KEY);
    if (raw && raw.length <= MAX_STORAGE_LENGTH) return Promise.resolve(normalizeWorkspaceState(JSON.parse(raw)));
  } catch {
    // Invalid JSON and unavailable storage both recover to an empty workspace.
  }
  return Promise.resolve(normalizeWorkspaceState(null));
}

function saveState(state) {
  return writeStorage(STORAGE_KEY, JSON.stringify(normalizeWorkspaceState(state)));
}

export function createDebouncedSave(delayMs = 500) {
  let timeoutId = null;
  let latestState = null;

  function flush() {
    if (timeoutId !== null) clearTimeout(timeoutId);
    timeoutId = null;
    if (latestState === null) return;
    saveState(latestState);
    latestState = null;
  }

  function debouncedSave(state) {
    latestState = state;
    if (timeoutId !== null) clearTimeout(timeoutId);
    timeoutId = setTimeout(flush, delayMs);
  }

  return { debouncedSave, flush };
}

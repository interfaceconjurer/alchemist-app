// Constants for panel sizing
export const LEFT_PANEL_MIN_WIDTH = 280;
export const LEFT_PANEL_DEFAULT_WIDTH = 380;

export const getLeftPanelMaxWidth = () => Math.max(LEFT_PANEL_MIN_WIDTH, Math.floor(window.innerWidth / 2));

// Initial state structure
export const getInitialState = () => ({
  isMobile: false,
  leftPanelWidth: LEFT_PANEL_DEFAULT_WIDTH,
  openTabs: [],
  activeTabId: null,
  stateLoaded: false,
  animatedTabs: new Set(),
  fadingTabs: new Set(),
  commandPaletteOpen: false,
  draggedTabId: null,
  dropTargetIndex: null,
  previewTabId: null,
  // Split view state
  splitView: {
    enabled: false,
    leftPaneTabIds: [],
    rightPaneTabIds: [],
    leftActiveTabId: null,
    rightActiveTabId: null,
    leftPanePreviewTabId: null,
    rightPanePreviewTabId: null,
    activePaneId: 'left',
    splitterPosition: 50
  },
  // Enhanced drag state
  dragThreshold: {
    startX: 0,
    startY: 0,
    startTime: 0,
    tabId: null,
    isDragging: false,
    dropZone: null,
    dragSource: null
  }
});

// Default drag threshold values
export const DRAG_THRESHOLD_DISTANCE = 5; // pixels
export const DRAG_THRESHOLD_TIME = 150; // milliseconds

// Double-click detection delay
export const DOUBLE_CLICK_DELAY = 250; // milliseconds

// Get default drag threshold state
export const getDefaultDragThreshold = () => ({
  startX: 0,
  startY: 0,
  startTime: 0,
  tabId: null,
  isDragging: false,
  dropZone: null,
  dragSource: null
});

// Get default split view state
export const getDefaultSplitViewState = () => ({
  enabled: false,
  leftPaneTabIds: [],
  rightPaneTabIds: [],
  leftActiveTabId: null,
  rightActiveTabId: null,
  leftPanePreviewTabId: null,
  rightPanePreviewTabId: null,
  activePaneId: 'left',
  splitterPosition: 50
});

// Used at the persistence boundary and after pane membership changes.
export function normalizeSplitView(value, openTabIds) {
  if (!value || value.enabled !== true) return getDefaultSplitViewState();
  const validIds = new Set(openTabIds);
  const normalizeIds = (ids) => [...new Set(Array.isArray(ids) ? ids : [])].filter(id => validIds.has(id));
  const leftPaneTabIds = normalizeIds(value.leftPaneTabIds);
  const leftIds = new Set(leftPaneTabIds);
  const rightPaneTabIds = normalizeIds(value.rightPaneTabIds).filter(id => !leftIds.has(id));
  if (!leftPaneTabIds.length || !rightPaneTabIds.length) return getDefaultSplitViewState();
  const assigned = new Set([...leftPaneTabIds, ...rightPaneTabIds]);
  leftPaneTabIds.push(...openTabIds.filter(id => !assigned.has(id)));
  return {
    enabled: true,
    leftPaneTabIds,
    rightPaneTabIds,
    leftActiveTabId: leftPaneTabIds.includes(value.leftActiveTabId) ? value.leftActiveTabId : leftPaneTabIds[0],
    rightActiveTabId: rightPaneTabIds.includes(value.rightActiveTabId) ? value.rightActiveTabId : rightPaneTabIds[0],
    leftPanePreviewTabId: leftPaneTabIds.includes(value.leftPanePreviewTabId) ? value.leftPanePreviewTabId : null,
    rightPanePreviewTabId: rightPaneTabIds.includes(value.rightPanePreviewTabId) ? value.rightPanePreviewTabId : null,
    activePaneId: value.activePaneId === 'right' ? 'right' : 'left',
    splitterPosition: Number.isFinite(value.splitterPosition) ? Math.max(20, Math.min(80, value.splitterPosition)) : 50,
  };
}

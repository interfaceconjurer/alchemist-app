// Constants for panel sizing
export const LEFT_PANEL_MIN_WIDTH = 280;
export const LEFT_PANEL_DEFAULT_WIDTH = 380;

export const getLeftPanelMaxWidth = () => Math.floor(window.innerWidth / 2);

// Initial state structure
export const getInitialState = () => ({
  mainClass: "main",
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
    dropZone: null
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
  dropZone: null
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
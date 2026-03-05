// Tab validation and finding utilities

// Check if a tab is open
export const isTabOpen = (tabId, openTabs) => {
  return openTabs.some(tab => tab.id === tabId);
};

// Check if a tab ID is valid
export const isValidTabId = (tabId, validIds) => {
  return validIds.has(tabId);
};

// Find a tab by ID
export const findTabById = (tabId, tabs) => {
  return tabs.find(tab => tab.id === tabId);
};

// Filter tabs by pane IDs
export const filterTabsByPane = (tabs, paneTabIds) => {
  return tabs.filter(tab => paneTabIds.includes(tab.id));
};

// Get tabs for a specific pane in split view
export const getPaneTabs = (paneId, openTabs, splitView) => {
  if (!splitView.enabled) return openTabs;

  const paneTabIds = paneId === 'left'
    ? splitView.leftPaneTabIds
    : splitView.rightPaneTabIds;

  return filterTabsByPane(openTabs, paneTabIds);
};

// Get the active tab based on current state
export const getActiveTab = (state) => {
  if (!state.activeTabId) return null;

  return findTabById(state.activeTabId, state.openTabs);
};

// Get active tab for a specific pane
export const getPaneActiveTab = (paneId, state) => {
  if (!state.splitView.enabled) {
    return getActiveTab(state);
  }

  const activeTabId = paneId === 'left'
    ? state.splitView.leftActiveTabId
    : state.splitView.rightActiveTabId;

  if (!activeTabId) return null;

  return findTabById(activeTabId, state.openTabs);
};

// Check if a tab is a preview tab
export const isPreviewTab = (tabId, state) => {
  if (state.splitView.enabled) {
    return tabId === state.splitView.leftPanePreviewTabId ||
           tabId === state.splitView.rightPanePreviewTabId;
  }
  return tabId === state.previewTabId;
};

// Check if tab is in a specific pane
export const isTabInPane = (tabId, paneId, splitView) => {
  if (!splitView.enabled) return false;

  const paneTabIds = paneId === 'left'
    ? splitView.leftPaneTabIds
    : splitView.rightPaneTabIds;

  return paneTabIds.includes(tabId);
};

// Get which pane a tab is in (returns 'left', 'right', or null)
export const getTabPane = (tabId, splitView) => {
  if (!splitView.enabled) return null;

  if (splitView.leftPaneTabIds.includes(tabId)) return 'left';
  if (splitView.rightPaneTabIds.includes(tabId)) return 'right';

  return null;
};

// Count tabs in a pane
export const getPaneTabCount = (paneId, splitView) => {
  if (!splitView.enabled) return 0;

  return paneId === 'left'
    ? splitView.leftPaneTabIds.length
    : splitView.rightPaneTabIds.length;
};

// Check if a pane has any tabs
export const paneHasTabs = (paneId, splitView) => {
  return getPaneTabCount(paneId, splitView) > 0;
};

// Get the last tab in a list
export const getLastTab = (tabs) => {
  return tabs.length > 0 ? tabs[tabs.length - 1] : null;
};

// Get next available tab after closing one
export const getNextActiveTab = (closedTabId, tabs, currentActiveId) => {
  if (closedTabId !== currentActiveId) {
    return currentActiveId; // Keep current active if different tab was closed
  }

  const closedIndex = tabs.findIndex(tab => tab.id === closedTabId);
  const remainingTabs = tabs.filter(tab => tab.id !== closedTabId);

  if (remainingTabs.length === 0) {
    return null;
  }

  // Try to activate the tab at the same position, or the last one
  const newIndex = Math.min(closedIndex, remainingTabs.length - 1);
  return remainingTabs[newIndex].id;
};
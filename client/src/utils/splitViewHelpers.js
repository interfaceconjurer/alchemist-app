// Split view state management utilities

// Get the appropriate state keys for a pane
export const getPaneKeys = (paneId) => {
  return {
    tabsKey: paneId === 'left' ? 'leftPaneTabIds' : 'rightPaneTabIds',
    activeKey: paneId === 'left' ? 'leftActiveTabId' : 'rightActiveTabId',
    previewKey: paneId === 'left' ? 'leftPanePreviewTabId' : 'rightPanePreviewTabId'
  };
};

// Get the active pane ID
export const getActivePaneId = (splitView) => {
  return splitView.activePaneId || 'left';
};

// Get tab IDs for a specific pane
export const getPaneTabIds = (paneId, splitView) => {
  return paneId === 'left'
    ? splitView.leftPaneTabIds
    : splitView.rightPaneTabIds;
};

// Get active tab ID for a specific pane
export const getPaneActiveTabId = (paneId, splitView) => {
  return paneId === 'left'
    ? splitView.leftActiveTabId
    : splitView.rightActiveTabId;
};

// Get preview tab ID for a specific pane
export const getPanePreviewTabId = (paneId, splitView) => {
  return paneId === 'left'
    ? splitView.leftPanePreviewTabId
    : splitView.rightPanePreviewTabId;
};

// Update pane-specific state
export const updatePaneState = (splitView, paneId, updates) => {
  const keys = getPaneKeys(paneId);
  const newSplitView = { ...splitView };

  if ('tabIds' in updates) {
    newSplitView[keys.tabsKey] = updates.tabIds;
  }
  if ('activeTabId' in updates) {
    newSplitView[keys.activeKey] = updates.activeTabId;
  }
  if ('previewTabId' in updates) {
    newSplitView[keys.previewKey] = updates.previewTabId;
  }

  return newSplitView;
};

// Check if split view should be closed (one pane empty)
export const shouldCloseSplit = (leftTabCount, rightTabCount) => {
  return leftTabCount === 0 || rightTabCount === 0;
};

// Get the opposite pane ID
export const getOppositePane = (paneId) => {
  return paneId === 'left' ? 'right' : 'left';
};

// Calculate splitter position from pixel coordinates
export const calculateSplitterPosition = (clientX, containerWidth, containerLeft) => {
  const relativeX = clientX - containerLeft;
  const percentage = (relativeX / containerWidth) * 100;

  // Constrain between 20% and 80%
  return Math.max(20, Math.min(80, percentage));
};

// Check if a position is in the left or right drop zone
export const getDropZoneFromPosition = (clientX, containerRect, splitterPosition) => {
  const splitterX = containerRect.left + (containerRect.width * splitterPosition / 100);
  return clientX < splitterX ? 'left' : 'right';
};

// Create split view state from existing tabs
export const createSplitViewState = (tabs, draggedTabId, dropZone) => {
  const remainingTabs = tabs.filter(t => t.id !== draggedTabId);

  if (remainingTabs.length === 0) {
    return null; // Can't split with only one tab
  }

  const leftTabs = dropZone === 'split-left'
    ? [draggedTabId]
    : remainingTabs.map(t => t.id);

  const rightTabs = dropZone === 'split-right'
    ? [draggedTabId]
    : remainingTabs.map(t => t.id);

  return {
    enabled: true,
    leftPaneTabIds: leftTabs,
    rightPaneTabIds: rightTabs,
    leftActiveTabId: leftTabs[0] || null,
    rightActiveTabId: rightTabs[0] || null,
    leftPanePreviewTabId: null,
    rightPanePreviewTabId: null,
    activePaneId: dropZone === 'split-left' ? 'left' : 'right',
    splitterPosition: 50
  };
};

// Merge split view back to single pane
export const mergeSplitView = (splitView, openTabs) => {
  const allTabIds = [...new Set([...splitView.leftPaneTabIds, ...splitView.rightPaneTabIds])];

  // Determine the new active tab (prefer from the non-empty pane)
  let newActiveTabId = null;
  if (splitView.leftPaneTabIds.length > 0) {
    newActiveTabId = splitView.leftActiveTabId;
  } else if (splitView.rightPaneTabIds.length > 0) {
    newActiveTabId = splitView.rightActiveTabId;
  }

  // Determine the global preview tab
  let globalPreviewTabId = null;
  if (splitView.leftPanePreviewTabId) {
    globalPreviewTabId = splitView.leftPanePreviewTabId;
  } else if (splitView.rightPanePreviewTabId) {
    globalPreviewTabId = splitView.rightPanePreviewTabId;
  }

  return {
    allTabIds,
    activeTabId: newActiveTabId,
    previewTabId: globalPreviewTabId
  };
};
// Drag and drop utility functions

// Calculate distance between two points
export const calculateDistance = (x1, y1, x2, y2) => {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
};

// Check if drag threshold has been met
export const isDragThresholdMet = (distance, timeDelta, minDistance = 5, minTime = 150) => {
  return distance >= minDistance && timeDelta >= minTime;
};

// Detect drop zone based on cursor position
export const detectDropZone = (clientX, clientY, stageRect, splitViewEnabled, tabCount, splitterPosition) => {
  // Check if cursor is over the stage area
  if (!isOverStage(clientX, clientY, stageRect)) {
    return null;
  }

  if (!splitViewEnabled) {
    return detectSinglePaneDropZone(clientX, stageRect, tabCount);
  } else {
    return detectSplitPaneDropZone(clientX, stageRect, splitterPosition);
  }
};

// Check if coordinates are over the stage area
export const isOverStage = (clientX, clientY, stageRect) => {
  return clientY >= stageRect.top &&
         clientY <= stageRect.bottom &&
         clientX >= stageRect.left &&
         clientX <= stageRect.right;
};

// Detect drop zone in single pane mode
export const detectSinglePaneDropZone = (clientX, stageRect, tabCount) => {
  const midPoint = stageRect.left + stageRect.width * 0.5;

  // Only allow split if we have 2+ tabs
  if (tabCount >= 2) {
    if (clientX < midPoint) {
      return 'split-left';  // Create split, drop in left
    } else {
      return 'split-right'; // Create split, drop in right
    }
  }
  return 'reorder'; // Regular tab reorder if only 1 tab
};

// Detect drop zone in split pane mode
export const detectSplitPaneDropZone = (clientX, stageRect, splitterPosition) => {
  const splitterX = stageRect.left + (stageRect.width * splitterPosition / 100);
  return clientX < splitterX ? 'left' : 'right';
};

// Create ghost element for dragging
export const createGhostElement = (tabElement, clientX, clientY) => {
  if (!tabElement) return null;

  const ghost = tabElement.cloneNode(true);
  ghost.className = 'stage-drag-ghost';
  ghost.style.position = 'fixed';
  ghost.style.pointerEvents = 'none';
  ghost.style.zIndex = '1000';
  ghost.style.opacity = '0.8';
  ghost.style.left = `${clientX}px`;
  ghost.style.top = `${clientY}px`;
  ghost.style.transform = 'translate(-50%, -50%)';

  return ghost;
};

// Update ghost element position
export const updateGhostPosition = (ghostElement, clientX, clientY) => {
  if (!ghostElement) return;

  ghostElement.style.left = `${clientX}px`;
  ghostElement.style.top = `${clientY}px`;
};

// Clean up ghost element
export const removeGhostElement = (ghostElement) => {
  if (ghostElement && ghostElement.parentNode) {
    ghostElement.parentNode.removeChild(ghostElement);
  }
};

// Get drop zone display info for visual feedback
export const getDropZoneInfo = (dropZone) => {
  const zoneMap = {
    'split-left': {
      label: 'Create split - Left pane',
      className: 'drop-zone-split-left',
      position: 'left'
    },
    'split-right': {
      label: 'Create split - Right pane',
      className: 'drop-zone-split-right',
      position: 'right'
    },
    'left': {
      label: 'Move to left pane',
      className: 'drop-zone-left',
      position: 'left'
    },
    'right': {
      label: 'Move to right pane',
      className: 'drop-zone-right',
      position: 'right'
    },
    'reorder': {
      label: 'Reorder tabs',
      className: 'drop-zone-reorder',
      position: 'center'
    }
  };

  return zoneMap[dropZone] || null;
};

// Check if a drop action would result in a valid state
export const isValidDrop = (dropZone, tabId, state) => {
  if (!dropZone || !tabId) return false;

  // Don't allow dropping a tab onto itself
  if (dropZone === 'reorder' && state.openTabs.length <= 1) {
    return false;
  }

  // Don't allow split with only one tab
  if ((dropZone === 'split-left' || dropZone === 'split-right') && state.openTabs.length < 2) {
    return false;
  }

  return true;
};

// Calculate drop index for tab reordering
export const calculateDropIndex = (clientX, tabElements) => {
  if (!tabElements || tabElements.length === 0) return null;

  for (let i = 0; i < tabElements.length; i++) {
    const rect = tabElements[i].getBoundingClientRect();
    const midpoint = rect.left + rect.width / 2;

    if (clientX < midpoint) {
      return i;
    }
  }

  return tabElements.length;
};
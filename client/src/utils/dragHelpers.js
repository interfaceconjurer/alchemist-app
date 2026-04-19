export const calculateDistance = (x1, y1, x2, y2) => {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
};

export const isDragThresholdMet = (distance, timeDelta, minDistance = 5, minTime = 150) => {
  return distance >= minDistance && timeDelta >= minTime;
};

export const isOverStage = (clientX, clientY, stageRect) => {
  return clientY >= stageRect.top &&
         clientY <= stageRect.bottom &&
         clientX >= stageRect.left &&
         clientX <= stageRect.right;
};

export const detectSinglePaneDropZone = (clientX, stageRect, tabCount) => {
  const midPoint = stageRect.left + stageRect.width * 0.5;
  if (tabCount >= 2) {
    return clientX < midPoint ? 'split-left' : 'split-right';
  }
  return 'reorder';
};

export const detectSplitPaneDropZone = (clientX, stageRect, splitterPosition) => {
  const splitterX = stageRect.left + (stageRect.width * splitterPosition / 100);
  return clientX < splitterX ? 'left' : 'right';
};

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

export const updateGhostPosition = (ghostElement, clientX, clientY) => {
  if (!ghostElement) return;
  ghostElement.style.left = `${clientX}px`;
  ghostElement.style.top = `${clientY}px`;
};

export const detectSidebarDropZone = (clientX, stageRect, splitView, tabCount) => {
  if (splitView.enabled) return detectSplitPaneDropZone(clientX, stageRect, splitView.splitterPosition);
  if (tabCount === 0) return 'add-tab';
  const relX = (clientX - stageRect.left) / stageRect.width;
  if (relX < 0.33) return 'split-left';
  if (relX > 0.66) return 'split-right';
  return 'add-tab';
};

export const removeGhostElement = (ghostElement) => {
  if (ghostElement && ghostElement.parentNode) {
    ghostElement.parentNode.removeChild(ghostElement);
  }
};

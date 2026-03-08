import {
  DRAG_THRESHOLD_DISTANCE,
  DRAG_THRESHOLD_TIME,
  getDefaultDragThreshold
} from '../utils/stateHelpers';
import {
  calculateDistance,
  isDragThresholdMet,
  createGhostElement,
  updateGhostPosition,
  removeGhostElement,
  isOverStage,
  detectSinglePaneDropZone,
  detectSplitPaneDropZone
} from '../utils/dragHelpers';

// Factory function to create drag & drop manager with component instance binding
export function createDragDropManager(component) {
  // Enhanced drag handlers with thresholds
  const handleTabMouseDown = (e, tabId) => {
    // Prevent drag on close button
    if (e.target.classList.contains('stage-tab-close')) return;

    e.preventDefault();
    component.dragState = {
      startX: e.clientX,
      startY: e.clientY,
      startTime: Date.now(),
      tabId: tabId,
      potentialDrag: true
    };

    // Add mouse move/up listeners for drag detection
    document.addEventListener('mousemove', handleDragDetection);
    document.addEventListener('mouseup', handleDragCancel);
  };

  const handleDragDetection = (e) => {
    if (!component.dragState || !component.dragState.potentialDrag) return;

    const distance = calculateDistance(
      component.dragState.startX,
      component.dragState.startY,
      e.clientX,
      e.clientY
    );
    const timeDelta = Date.now() - component.dragState.startTime;

    // Check thresholds
    if (isDragThresholdMet(distance, timeDelta, DRAG_THRESHOLD_DISTANCE, DRAG_THRESHOLD_TIME)) {
      initiateDrag(e);
    }
  };

  const initiateDrag = (e) => {
    const { tabId } = component.dragState;

    // Create ghost element
    const tabElement = document.querySelector(`[data-tab-id="${tabId}"]`);
    component.ghostElement = createGhostElement(tabElement, e.clientX, e.clientY);
    if (component.ghostElement) {
      document.body.appendChild(component.ghostElement);
    }

    // Update state to show we're dragging
    component.setState({
      dragThreshold: {
        ...component.state.dragThreshold,
        isDragging: true,
        tabId: tabId
      },
      draggedTabId: tabId
    });

    // Switch to drag move handler
    document.removeEventListener('mousemove', handleDragDetection);
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
    document.body.style.cursor = 'grabbing';
  };

  const handleDragMove = (e) => {
    if (!component.state.dragThreshold.isDragging) return;

    // Update ghost position
    updateGhostPosition(component.ghostElement, e.clientX, e.clientY);

    // Detect drop zone
    const dropZone = detectDropZone(e);
    if (dropZone !== component.state.dragThreshold.dropZone) {
      component.setState(state => ({
        dragThreshold: { ...state.dragThreshold, dropZone }
      }));
    }
  };

  const detectDropZone = (e) => {
    if (!component.stageRef.current) return null;

    const { clientX, clientY } = e;
    const stageRect = component.stageRef.current.getBoundingClientRect();

    // Check if cursor is over the stage area
    if (!isOverStage(clientX, clientY, stageRect)) {
      return null;
    }

    if (!component.state.splitView.enabled) {
      return detectSinglePaneDropZone(clientX, stageRect, component.state.openTabs.length);
    } else {
      return detectSplitPaneDropZone(clientX, stageRect, component.state.splitView.splitterPosition);
    }
  };

  const handleDragEnd = (e) => {
    const { dropZone, tabId } = component.state.dragThreshold;

    // Clean up ghost element
    removeGhostElement(component.ghostElement);
    component.ghostElement = null;

    // Clean up event listeners
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
    document.body.style.cursor = '';

    // Handle the drop
    if (dropZone && tabId) {
      if (dropZone === 'split-left' || dropZone === 'split-right') {
        // Note: initiateSplit will be handled by splitViewManager
        if (component.initiateSplit) {
          component.initiateSplit(dropZone, tabId);
        }
      } else if (dropZone === 'left' || dropZone === 'right') {
        // Note: moveTabToPane will be handled by splitViewManager
        if (component.moveTabToPane) {
          component.moveTabToPane(dropZone, tabId);
        }
      }
      // 'reorder' case will be handled by existing tab reorder logic
    }

    // Reset drag state
    component.setState({
      dragThreshold: getDefaultDragThreshold(),
      draggedTabId: null,
      dropTargetIndex: null
    });

    component.dragState = null;
  };

  const handleDragCancel = () => {
    // Clean up if drag was never initiated
    document.removeEventListener('mousemove', handleDragDetection);
    document.removeEventListener('mouseup', handleDragCancel);
    component.dragState = null;
  };

  // Keep old drag handlers for backward compatibility but they won't be used
  const handleTabDragStart = (e) => { e.preventDefault(); };
  const handleTabDragOver = (e) => { e.preventDefault(); };
  const handleTabDragLeave = () => {};
  const handleTabDrop = () => {};
  const handleTabDragEnd = () => {};

  // Return the public API
  return {
    handleTabMouseDown,
    handleDragDetection,
    initiateDrag,
    handleDragMove,
    detectDropZone,
    handleDragEnd,
    handleDragCancel,
    handleTabDragStart,
    handleTabDragOver,
    handleTabDragLeave,
    handleTabDrop,
    handleTabDragEnd
  };
}
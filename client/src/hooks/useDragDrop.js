import { useCallback, useRef } from 'react';
import { DRAG_THRESHOLD_DISTANCE, DRAG_THRESHOLD_TIME } from '../utils/stateHelpers';
import {
  calculateDistance, isDragThresholdMet,
  createGhostElement, updateGhostPosition, removeGhostElement,
  isOverStage, detectSinglePaneDropZone, detectSplitPaneDropZone
} from '../utils/dragHelpers';

export function useDragDrop(stateRef, dispatch, stageRef, splitViewActions) {
  const dragStateRef = useRef(null);
  const ghostRef = useRef(null);

  const detectDropZone = useCallback((e) => {
    if (!stageRef.current) return null;
    const stageRect = stageRef.current.getBoundingClientRect();
    if (!isOverStage(e.clientX, e.clientY, stageRect)) return null;
    const state = stateRef.current;
    if (!state.splitView.enabled) return detectSinglePaneDropZone(e.clientX, stageRect, state.openTabs.length);
    return detectSplitPaneDropZone(e.clientX, stageRect, state.splitView.splitterPosition);
  }, [stageRef, stateRef]);

  const handleTabMouseDown = useCallback((e, tabId) => {
    if (e.target.classList.contains('stage-tab-close')) return;
    e.preventDefault();

    dragStateRef.current = { startX: e.clientX, startY: e.clientY, startTime: Date.now(), tabId, potentialDrag: true };

    const onDetect = (e) => {
      const ds = dragStateRef.current;
      if (!ds || !ds.potentialDrag) return;
      const distance = calculateDistance(ds.startX, ds.startY, e.clientX, e.clientY);
      const timeDelta = Date.now() - ds.startTime;
      if (!isDragThresholdMet(distance, timeDelta, DRAG_THRESHOLD_DISTANCE, DRAG_THRESHOLD_TIME)) return;

      const tabElement = document.querySelector(`[data-tab-id="${ds.tabId}"]`);
      ghostRef.current = createGhostElement(tabElement, e.clientX, e.clientY);
      if (ghostRef.current) document.body.appendChild(ghostRef.current);

      dispatch({ type: 'SET_DRAG_STATE', payload: { isDragging: true, tabId: ds.tabId }, draggedTabId: ds.tabId });

      document.removeEventListener('mousemove', onDetect);
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onEnd);
      document.body.style.cursor = 'grabbing';
    };

    const onMove = (e) => {
      updateGhostPosition(ghostRef.current, e.clientX, e.clientY);
      const dropZone = detectDropZone(e);
      if (dropZone !== stateRef.current.dragThreshold.dropZone) {
        dispatch({ type: 'SET_DRAG_STATE', payload: { dropZone } });
      }
    };

    const onEnd = () => {
      const { dropZone, tabId: dtTabId } = stateRef.current.dragThreshold;
      removeGhostElement(ghostRef.current);
      ghostRef.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onEnd);
      document.body.style.cursor = '';

      if (dropZone && dtTabId) {
        if (dropZone === 'split-left' || dropZone === 'split-right') {
          splitViewActions.current.initiateSplit(dropZone, dtTabId);
        } else if (dropZone === 'left' || dropZone === 'right') {
          splitViewActions.current.moveTabToPane(dropZone, dtTabId);
        }
      }

      dispatch({ type: 'CLEAR_DRAG' });
      dragStateRef.current = null;
    };

    const onCancel = () => {
      document.removeEventListener('mousemove', onDetect);
      document.removeEventListener('mouseup', onCancel);
      dragStateRef.current = null;
    };

    document.addEventListener('mousemove', onDetect);
    document.addEventListener('mouseup', onCancel);
  }, [stateRef, dispatch, detectDropZone, splitViewActions]);

  return { handleTabMouseDown };
}

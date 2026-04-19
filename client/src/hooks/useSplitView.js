import { useCallback, useRef } from 'react';
import { getDefaultSplitViewState } from '../utils/stateHelpers';

export function useSplitView(stateRef, dispatch, stageRef) {
  const isSplitterResizingRef = useRef(false);
  const splitterStartXRef = useRef(0);
  const splitterMoveRef = useRef(null);
  const splitterEndRef = useRef(null);

  const initiateSplit = useCallback((dropZone, draggedTabId) => {
    const state = stateRef.current;
    const remainingTabs = state.openTabs.filter(t => t.id !== draggedTabId);
    if (remainingTabs.length === 0) return;

    const leftTabs = dropZone === 'split-left' ? [draggedTabId] : remainingTabs.map(t => t.id);
    const rightTabs = dropZone === 'split-right' ? [draggedTabId] : remainingTabs.map(t => t.id);

    let leftPanePreviewTabId = null;
    let rightPanePreviewTabId = null;
    const wasDraggedPreview = state.previewTabId === draggedTabId;
    if (state.previewTabId && !wasDraggedPreview) {
      if (leftTabs.includes(state.previewTabId)) leftPanePreviewTabId = state.previewTabId;
      else if (rightTabs.includes(state.previewTabId)) rightPanePreviewTabId = state.previewTabId;
    }

    dispatch({
      splitView: {
        enabled: true, leftPaneTabIds: leftTabs, rightPaneTabIds: rightTabs,
        leftActiveTabId: leftTabs[0] || null, rightActiveTabId: rightTabs[0] || null,
        leftPanePreviewTabId, rightPanePreviewTabId,
        activePaneId: dropZone === 'split-left' ? 'left' : 'right',
        splitterPosition: 50
      },
      activeTabId: draggedTabId,
      previewTabId: null
    });
  }, [stateRef, dispatch]);

  const moveTabToPane = useCallback((targetPane, tabId) => {
    const state = stateRef.current;
    const { leftPaneTabIds, rightPaneTabIds, leftPanePreviewTabId, rightPanePreviewTabId } = state.splitView;

    const wasLeftPreview = leftPanePreviewTabId === tabId;
    const wasRightPreview = rightPanePreviewTabId === tabId;
    const newLeftTabs = leftPaneTabIds.filter(id => id !== tabId);
    const newRightTabs = rightPaneTabIds.filter(id => id !== tabId);

    let newLeftActiveTabId = state.splitView.leftActiveTabId;
    let newRightActiveTabId = state.splitView.rightActiveTabId;
    let newLeftPreviewTabId = leftPanePreviewTabId;
    let newRightPreviewTabId = rightPanePreviewTabId;

    if (targetPane === 'left') {
      newLeftTabs.push(tabId);
      newLeftActiveTabId = tabId;
    } else {
      newRightTabs.push(tabId);
      newRightActiveTabId = tabId;
    }
    if (wasLeftPreview || wasRightPreview) {
      if (newLeftPreviewTabId === tabId) newLeftPreviewTabId = null;
      if (newRightPreviewTabId === tabId) newRightPreviewTabId = null;
    }

    if (newLeftTabs.length === 0 || newRightTabs.length === 0) {
      let globalPreviewTabId = null;
      if (targetPane === 'left' && newLeftPreviewTabId) globalPreviewTabId = newLeftPreviewTabId;
      else if (targetPane === 'right' && newRightPreviewTabId) globalPreviewTabId = newRightPreviewTabId;
      dispatch({ splitView: getDefaultSplitViewState(), activeTabId: tabId, previewTabId: globalPreviewTabId });
      return;
    }

    dispatch({
      splitView: {
        ...state.splitView,
        leftPaneTabIds: newLeftTabs, rightPaneTabIds: newRightTabs,
        leftActiveTabId: newLeftActiveTabId, rightActiveTabId: newRightActiveTabId,
        leftPanePreviewTabId: newLeftPreviewTabId, rightPanePreviewTabId: newRightPreviewTabId,
        activePaneId: targetPane
      },
      activeTabId: tabId
    });
  }, [stateRef, dispatch]);

  const handleSplitterStart = useCallback((e) => {
    e.preventDefault();
    isSplitterResizingRef.current = true;

    const onMove = (e) => {
      if (!isSplitterResizingRef.current) return;
      const stageRect = stageRef.current?.getBoundingClientRect();
      if (!stageRect) return;
      const relativeX = e.clientX - stageRect.left;
      const percentage = Math.max(20, Math.min(80, (relativeX / stageRect.width) * 100));
      dispatch({ splitView: { ...stateRef.current.splitView, splitterPosition: percentage } });
    };

    const onEnd = () => {
      isSplitterResizingRef.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onEnd);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    splitterMoveRef.current = onMove;
    splitterEndRef.current = onEnd;

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onEnd);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [stateRef, dispatch, stageRef]);

  return { initiateSplit, moveTabToPane, handleSplitterStart };
}

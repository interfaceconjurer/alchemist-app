import { useCallback, useRef, useEffect } from 'react';
import { createFrameBatch } from '../utils/frameBatch';

export function useSplitView(stateRef, dispatch, stageRef) {
  const cleanupRef = useRef(null);
  useEffect(() => () => cleanupRef.current?.(), []);

  const initiateSplit = useCallback((dropZone, tabId) => {
    dispatch({ type: 'INITIATE_SPLIT', dropZone, tabId });
  }, [dispatch]);

  const moveTabToPane = useCallback((targetPane, tabId) => {
    dispatch({ type: 'MOVE_TAB_TO_PANE', targetPane, tabId });
  }, [dispatch]);

  const handleSplitterStart = useCallback((e) => {
    e.preventDefault();
    cleanupRef.current?.();
    const previousCursor = document.body.style.cursor;
    const previousSelection = document.body.style.userSelect;
    const pendingPosition = createFrameBatch((clientX) => {
      const stageRect = stageRef.current?.getBoundingClientRect();
      if (!stageRect?.width) return;
      const position = Math.max(20, Math.min(80, ((clientX - stageRect.left) / stageRect.width) * 100));
      if (position !== stateRef.current.splitView.splitterPosition) dispatch({ type: 'SET_SPLITTER_POSITION', position });
    });
    const onMove = (event) => pendingPosition.schedule(event.clientX);
    const cleanup = () => {
      pendingPosition.cancel();
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onEnd);
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousSelection;
      cleanupRef.current = null;
    };
    const onEnd = () => {
      pendingPosition.flush();
      cleanup();
    };
    cleanupRef.current = cleanup;
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onEnd);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [stateRef, dispatch, stageRef]);

  return { initiateSplit, moveTabToPane, handleSplitterStart };
}

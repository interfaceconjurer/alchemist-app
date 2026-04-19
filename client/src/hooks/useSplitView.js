import { useCallback, useRef } from 'react';

export function useSplitView(stateRef, dispatch, stageRef) {
  const isSplitterResizingRef = useRef(false);

  const initiateSplit = useCallback((dropZone, tabId) => {
    dispatch({ type: 'INITIATE_SPLIT', dropZone, tabId });
  }, [dispatch]);

  const moveTabToPane = useCallback((targetPane, tabId) => {
    dispatch({ type: 'MOVE_TAB_TO_PANE', targetPane, tabId });
  }, [dispatch]);

  const handleSplitterStart = useCallback((e) => {
    e.preventDefault();
    isSplitterResizingRef.current = true;

    const onMove = (e) => {
      if (!isSplitterResizingRef.current) return;
      const stageRect = stageRef.current?.getBoundingClientRect();
      if (!stageRect) return;
      const relativeX = e.clientX - stageRect.left;
      const position = Math.max(20, Math.min(80, (relativeX / stageRect.width) * 100));
      dispatch({ type: 'SET_SPLITTER_POSITION', position });
    };

    const onEnd = () => {
      isSplitterResizingRef.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onEnd);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onEnd);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [dispatch, stageRef]);

  return { initiateSplit, moveTabToPane, handleSplitterStart };
}

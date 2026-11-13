import { useCallback, useRef, useMemo, useEffect } from 'react';
import { LEFT_PANEL_MIN_WIDTH, getLeftPanelMaxWidth } from '../utils/stateHelpers';
import { createFrameBatch } from '../utils/frameBatch';

export function useResize(stateRef, dispatch) {
  const isResizingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  const pendingWidth = useMemo(() => createFrameBatch((width) => {
    if (width !== stateRef.current.leftPanelWidth) dispatch({ type: 'SET_LEFT_PANEL_WIDTH', width });
  }), [stateRef, dispatch]);
  useEffect(() => () => pendingWidth.cancel(), [pendingWidth]);

  const handleResizeStart = useCallback((e) => {
    e.preventDefault();
    isResizingRef.current = true;
    document.body.classList.add('is-dragging');
    startXRef.current = e.clientX;
    startWidthRef.current = stateRef.current.leftPanelWidth;
  }, [stateRef]);

  const handleResizeMove = useCallback((e) => {
    if (!isResizingRef.current) return;
    const diff = e.clientX - startXRef.current;
    const width = Math.min(Math.max(startWidthRef.current + diff, LEFT_PANEL_MIN_WIDTH), getLeftPanelMaxWidth());
    pendingWidth.schedule(width);
  }, [pendingWidth]);

  const handleResizeEnd = useCallback(() => {
    pendingWidth.flush();
    if (isResizingRef.current) document.body.classList.remove('is-dragging');
    isResizingRef.current = false;
  }, [pendingWidth]);

  const handleWindowResize = useCallback(() => {
    const maxWidth = getLeftPanelMaxWidth();
    if (stateRef.current.leftPanelWidth > maxWidth) {
      dispatch({ type: 'SET_LEFT_PANEL_WIDTH', width: maxWidth });
    }
  }, [stateRef, dispatch]);

  return { handleResizeStart, handleResizeMove, handleResizeEnd, handleWindowResize };
}

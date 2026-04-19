import { useCallback, useRef } from 'react';
import { LEFT_PANEL_MIN_WIDTH, getLeftPanelMaxWidth } from '../utils/stateHelpers';

export function useResize(stateRef, dispatch) {
  const isResizingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const handleResizeStart = useCallback((e) => {
    e.preventDefault();
    isResizingRef.current = true;
    startXRef.current = e.clientX;
    startWidthRef.current = stateRef.current.leftPanelWidth;
  }, [stateRef]);

  const handleResizeMove = useCallback((e) => {
    if (!isResizingRef.current) return;
    const diff = e.clientX - startXRef.current;
    const newWidth = startWidthRef.current + diff;
    const clampedWidth = Math.min(Math.max(newWidth, LEFT_PANEL_MIN_WIDTH), getLeftPanelMaxWidth());
    dispatch({ leftPanelWidth: clampedWidth });
  }, [dispatch]);

  const handleResizeEnd = useCallback(() => {
    isResizingRef.current = false;
  }, []);

  const handleWindowResize = useCallback(() => {
    const maxWidth = getLeftPanelMaxWidth();
    if (stateRef.current.leftPanelWidth > maxWidth) {
      dispatch({ leftPanelWidth: maxWidth });
    }
  }, [stateRef, dispatch]);

  return { handleResizeStart, handleResizeMove, handleResizeEnd, handleWindowResize };
}

import { useEffect, useRef } from 'react';

export function useSwipeBack(stageRef, isMobile, hasActiveTab, dispatch) {
  const touchRef = useRef(null);

  useEffect(() => {
    if (!isMobile || !hasActiveTab) return;
    const el = stageRef.current;
    if (!el) return;

    // A swipe is one finger moving right across the work item itself. Touches
    // inside the artifact viewer (it is in the stage's DOM, so they bubble here)
    // belong to the viewer: pinching and panning a zoomed image can easily end
    // 80px to the right of where it began. A second finger cancels the swipe.
    const onStart = (e) => {
      if (e.touches.length !== 1 || e.target.closest?.('dialog')) { touchRef.current = null; return; }
      const touch = e.touches[0];
      touchRef.current = { startX: touch.clientX, startY: touch.clientY };
    };

    const onEnd = (e) => {
      if (!touchRef.current || e.touches.length > 0) { touchRef.current = null; return; }
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchRef.current.startX;
      const dy = Math.abs(touch.clientY - touchRef.current.startY);
      touchRef.current = null;
      if (dx > 80 && dy < dx * 0.58) {
        dispatch({ type: 'CLOSE_ACTIVE_TAB' });
      }
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchend', onEnd);
    };
  }, [stageRef, isMobile, hasActiveTab, dispatch]);
}

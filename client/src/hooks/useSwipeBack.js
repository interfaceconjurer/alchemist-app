import { useEffect, useRef } from 'react';

export function useSwipeBack(stageRef, isMobile, hasActiveTab, dispatch) {
  const touchRef = useRef(null);

  useEffect(() => {
    if (!isMobile || !hasActiveTab) return;
    const el = stageRef.current;
    if (!el) return;

    const onStart = (e) => {
      const touch = e.touches[0];
      touchRef.current = { startX: touch.clientX, startY: touch.clientY };
    };

    const onEnd = (e) => {
      if (!touchRef.current) return;
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

import { useCallback, useEffect, useRef, useState } from 'react';

const releaseCapture = (target, pointerId) => {
  if (target?.hasPointerCapture?.(pointerId)) target.releasePointerCapture(pointerId);
};

/** Each pointer owns its hold. The crystal is decorative, so there is no keyboard hold. */
export function useDormancyInteraction(dormancy) {
  const pointers = useRef(new Set());
  const surface = useRef(null);
  const [pressed, setPressed] = useState(false);
  const sync = useCallback(() => {
    const held = pointers.current.size > 0;
    if (held && !dormancy.engaged) dormancy.engage();
    else if (!held && dormancy.engaged) dormancy.release();
    setPressed(held);
  }, [dormancy]);

  const onPointerDown = useCallback((e) => {
    surface.current = e.currentTarget;
    pointers.current.add(e.pointerId);
    sync();
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }, [sync]);
  const onPointerEnd = useCallback((e) => {
    if (!pointers.current.delete(e.pointerId)) return;
    sync();
    releaseCapture(e.currentTarget, e.pointerId);
  }, [sync]);
  const clearHolds = useCallback((target = surface.current) => {
    if (pointers.current.size === 0) return;
    const heldPointers = [...pointers.current];
    pointers.current.clear();
    sync();
    for (const pointerId of heldPointers) releaseCapture(target, pointerId);
  }, [sync]);

  useEffect(() => {
    const onWindowBlur = () => clearHolds();
    const onVisibilityChange = () => { if (document.visibilityState === 'hidden') clearHolds(); };
    window.addEventListener('blur', onWindowBlur);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('blur', onWindowBlur);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [clearHolds]);

  return {
    pressed,
    handlers: {
      onPointerDown,
      onPointerUp: onPointerEnd,
      onPointerCancel: onPointerEnd,
      onLostPointerCapture: onPointerEnd,
    },
  };
}

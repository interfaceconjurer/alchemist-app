import { useCallback, useEffect, useRef, useState } from 'react';

const releaseCapture = (target, pointerId) => {
  if (target?.hasPointerCapture?.(pointerId)) target.releasePointerCapture(pointerId);
};

/** Each pointer owns its hold; keyboard toggles an independent hold. */
export function useDormancyInteraction(dormancy) {
  const pointers = useRef(new Set());
  const keyboardHeld = useRef(false);
  const surface = useRef(null);
  const [pressed, setPressed] = useState(false);
  const sync = useCallback(() => {
    const held = pointers.current.size > 0 || keyboardHeld.current;
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
  const onKeyDown = useCallback((e) => {
    if (e.key !== ' ' && e.key !== 'Enter') return;
    e.preventDefault();
    if (e.repeat) return;
    surface.current = e.currentTarget;
    keyboardHeld.current = !keyboardHeld.current;
    sync();
  }, [sync]);
  const clearHolds = useCallback((target = surface.current) => {
    if (pointers.current.size === 0 && !keyboardHeld.current) return;
    const heldPointers = [...pointers.current];
    pointers.current.clear();
    keyboardHeld.current = false;
    sync();
    for (const pointerId of heldPointers) releaseCapture(target, pointerId);
  }, [sync]);
  const onBlur = useCallback((e) => clearHolds(e.currentTarget), [clearHolds]);

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
      onKeyDown,
      onBlur,
    },
  };
}

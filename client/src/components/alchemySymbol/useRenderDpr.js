import { useCallback, useEffect, useState } from 'react';
import { DPR_RANGE } from './renderPolicy';

function deviceDpr() {
  const ratio = Number.isFinite(window.devicePixelRatio) ? window.devicePixelRatio : 1;
  return Math.max(DPR_RANGE[0], Math.min(DPR_RANGE[1], ratio));
}

/** Retain adaptive quality in Canvas props: R3F reapplies its DPR prop on every configure. */
export function useRenderDpr() {
  const [displayDpr, setDisplayDpr] = useState(deviceDpr);
  const [ceiling, setCeiling] = useState(DPR_RANGE[1]);
  const lowerDpr = useCallback((next) => {
    if (!Number.isFinite(next)) return;
    setCeiling((current) => Math.max(DPR_RANGE[0], Math.min(current, next)));
  }, []);
  useEffect(() => {
    const update = () => setDisplayDpr(deviceDpr());
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return { dpr: Math.min(displayDpr, ceiling), lowerDpr };
}

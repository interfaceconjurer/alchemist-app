import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { dormancyPhase } from './dormancy';

/** Unscaled active time drives waking, even while the animation clock is still. */
export default function DormancyController({ active, dormancy, timeScale, uVitality, bubbleVisibility, setBloomGain, onState }) {
  const last = useRef(null);
  const resumed = useRef(true);
  useEffect(() => { resumed.current = true; }, [active]);

  useFrame((_, frameDelta) => {
    if (!active) return;
    // Match the shared animation clock: hidden time and the first resumed
    // delta must not advance either motion or the crystal's light/quiet period.
    const s = dormancy.step(resumed.current ? 0 : frameDelta);
    resumed.current = false;
    timeScale.current = s.vitality;
    uVitality.value = s.light;
    bubbleVisibility.current = s.light;
    setBloomGain(s.light);
    const key = dormancyPhase(s);
    if (key !== last.current) { last.current = key; onState(key); }
  }, -200);
  return null;
}

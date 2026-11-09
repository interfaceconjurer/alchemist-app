import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { animationDelta, createDprBudget } from './renderPolicy';
import { useGraphicsFailure } from './GraphicsBoundary';

/**
 * `timeScale` (optional ref, 0..1): multiplies how fast the shared animation
 * clock advances. Dormancy uses it so every animated system slows together.
 */
export default function RenderPolicyController({ active, lowerDpr, animationTime, timeScale }) {
  const gl = useThree((state) => state.gl);
  const reportFailure = useGraphicsFailure();
  const budget = useMemo(() => createDprBudget(), []);
  const resumed = useRef(true);

  useEffect(() => { budget.reset(); resumed.current = true; }, [active, budget]);
  useEffect(() => {
    const previous = gl.onDeviceLost;
    const onDeviceLost = (info) => {
      previous?.call(gl, info);
      reportFailure();
    };
    gl.onDeviceLost = onDeviceLost;
    return () => { if (gl.onDeviceLost === onDeviceLost) gl.onDeviceLost = previous; };
  }, [gl, reportFailure]);

  useFrame((state, delta) => {
    if (!active) return;
    // A resumed R3F clock can contain the whole hidden interval. Freeze the
    // shared simulation time for that first frame rather than jumping 50 ms.
    if (resumed.current) { resumed.current = false; return; }
    if (animationTime) animationTime.value += animationDelta(delta) * (timeScale ? timeScale.current : 1);
    const next = budget.sample(delta, state.viewport.dpr);
    if (next !== null) lowerDpr(next);
  }, -100);
  return null;
}

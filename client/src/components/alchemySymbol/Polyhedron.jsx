import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three/webgpu';
import { createBloomPipeline } from './bloomPipeline';
import { useGraphicsFailure } from './GraphicsBoundary';
import { profileObserver } from './profileObserver';

// Shared rendering pieces for the crystal (MorphingSolid).

// Edge tube radius. Vertex joints use the same radius so corners don't read as beads.
export const FILAMENT_RADIUS = 0.014;

/** Owns rendering: scene pass + bloom. Runs at priority 1 so R3F skips its own render. */
/** `gain` (optional ref, 0..1) scales strength live without rebuilding the pipeline. */
/** `onFirstFrame` (optional): called once, right after the first frame has been drawn. */
export function Bloom({ strength = 0.28, radius = 0.4, threshold = 0.35, gain, onFirstFrame }) {
  const { gl, scene, camera } = useThree();
  const graph = useRef(null);
  const reportFailure = useGraphicsFailure();
  const onFirstFrameRef = useRef(onFirstFrame);
  onFirstFrameRef.current = onFirstFrame;
  const reported = useRef(false);
  useEffect(() => {
    const owned = createBloomPipeline(gl, scene, camera);
    let cancelled = false;
    // Nothing draws until the shaders are compiled, so the first visible frame
    // is a finished one and the loader covers the whole wait.
    owned.compile()
      .then(() => { if (!cancelled) graph.current = owned; })
      .catch(() => { if (!cancelled) reportFailure(); });
    return () => { cancelled = true; graph.current = null; owned.dispose(); };
  }, [gl, scene, camera, reportFailure]);
  useEffect(() => {
    graph.current?.update({ strength, radius, threshold });
  }, [gl, scene, camera, strength, radius, threshold]);
  useFrame(() => {
    if (!graph.current) return;
    if (gain) graph.current.glow.strength.value = strength * gain.current;
    const started = profileObserver ? performance.now() : 0;
    try {
      graph.current.render();
      if (!reported.current) { reported.current = true; onFirstFrameRef.current?.(); }
    }
    catch { reportFailure(); }
    finally { profileObserver?.render({ at: performance.now(), cpuSubmitMs: performance.now() - started }); }
  }, 1);
  return null;
}

export async function createRenderer(props) {
  const renderer = new THREE.WebGPURenderer({ ...props, antialias: true, alpha: true });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.85;
  try {
    await renderer.init();
    return renderer;
  } catch (error) {
    await renderer.dispose().catch(() => {});
    throw error;
  }
}

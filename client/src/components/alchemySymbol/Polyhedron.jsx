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
export function Bloom({ strength = 0.28, radius = 0.4, threshold = 0.35, gain }) {
  const { gl, scene, camera } = useThree();
  const graph = useRef(null);
  const reportFailure = useGraphicsFailure();
  useEffect(() => {
    const owned = createBloomPipeline(gl, scene, camera);
    graph.current = owned;
    return () => { graph.current = null; owned.dispose(); };
  }, [gl, scene, camera]);
  useEffect(() => {
    graph.current?.update({ strength, radius, threshold });
  }, [gl, scene, camera, strength, radius, threshold]);
  useFrame(() => {
    if (!graph.current) return;
    if (gain) graph.current.glow.strength.value = strength * gain.current;
    const started = profileObserver ? performance.now() : 0;
    try { graph.current.render(); }
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

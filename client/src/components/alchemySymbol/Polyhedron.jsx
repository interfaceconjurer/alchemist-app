import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three/webgpu';
import { uniform } from 'three/tsl';
import { createBloomPipeline } from './bloomPipeline';
import { useGraphicsFailure } from './GraphicsBoundary';
import RenderPolicyController from './RenderPolicyController';
import { animationDelta } from './renderPolicy';
import { useRenderDpr } from './useRenderDpr';
import { profileObserver } from './profileObserver';
import { useThemeColor } from './useThemeColor';
import FloatingBubbles from './FloatingBubbles';
import { createCrystalMaterial, createFilamentMaterial } from './crystal/crystalMaterial';
import { createStudioEnvironment } from './crystal/environment';

// On-screen size comes from the canvas height (view.css); the camera FOV is fixed,
// so a taller canvas scales the solid proportionally without reframing.
const SHAPE_SCALE = 1;
// Edge tube radius. Vertex joints use the same radius so corners don't read as beads.
export const FILAMENT_RADIUS = 0.014;

/** Fan-triangulate each face; flip any triangle whose normal points inward. */
function buildSolidGeometry(faces) {
  const positions = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const nrm = new THREE.Vector3(), centroid = new THREE.Vector3();
  for (const { vertices } of faces) {
    for (let i = 1; i < vertices.length - 1; i++) {
      a.fromArray(vertices[0]); b.fromArray(vertices[i]); c.fromArray(vertices[i + 1]);
      nrm.subVectors(b, a).cross(c.clone().sub(a));
      centroid.copy(a).add(b).add(c).divideScalar(3);
      if (nrm.dot(centroid) < 0) positions.push(...a.toArray(), ...c.toArray(), ...b.toArray());
      else positions.push(...a.toArray(), ...b.toArray(), ...c.toArray());
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals(); // non-indexed → flat facet normals
  return geo;
}

const UP = new THREE.Vector3(0, 1, 0);

function Filament({ start, end, material, radius = FILAMENT_RADIUS }) {
  const { position, quaternion, length } = useMemo(() => {
    const s = new THREE.Vector3(...start), e = new THREE.Vector3(...end);
    const dir = e.clone().sub(s);
    return {
      position: s.clone().add(e).multiplyScalar(0.5),
      quaternion: new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize()),
      length: dir.length(),
    };
  }, [start, end]);
  return (
    <mesh position={position} quaternion={quaternion} material={material}>
      <cylinderGeometry args={[radius, radius, length, 8, 1, true]} />
    </mesh>
  );
}

/** Owns rendering: scene pass + bloom. Runs at priority 1 so R3F skips its own render. */
export function Bloom({ strength = 0.28, radius = 0.4, threshold = 0.35 }) {
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
    const started = profileObserver ? performance.now() : 0;
    try { graph.current.render(); }
    catch { reportFailure(); }
    finally { profileObserver?.render({ at: performance.now(), cpuSubmitMs: performance.now() - started }); }
  }, 1);
  return null;
}

function CrystalShape({ vertices, edges, faces, spawnPoint, position = [0, -1.5, 0], tilt, animationTime }) {
  const previousTime = useRef(animationTime.value);
  const spinRef = useRef();
  const gl = useThree((s) => s.gl);
  const useWgsl = gl.backend?.isWebGPUBackend === true;

  const environment = useMemo(() => createStudioEnvironment(gl), [gl]);
  const envTexture = environment.texture;
  const geometry = useMemo(() => buildSolidGeometry(faces), [faces]);
  const { material } = useMemo(
    () => createCrystalMaterial({ envTexture, useWgsl, animationTime }),
    [envTexture, useWgsl, animationTime],
  );
  const filament = useMemo(() => createFilamentMaterial({ envTexture, animationTime }), [envTexture, animationTime]);

  useEffect(() => () => { geometry.dispose(); }, [geometry]);
  useEffect(() => () => { material.dispose(); filament.dispose(); environment.dispose(); }, [material, filament, environment]);

  useFrame(() => {
    const delta = animationDelta(animationTime.value - previousTime.current);
    previousTime.current = animationTime.value;
    if (spinRef.current) spinRef.current.rotation.y += delta * 0.5;
  });

  // Bubbles stay at their original size/rise; only their spawn points follow the scaled surface.
  const scaledSpawn = useCallback(() => spawnPoint().multiplyScalar(SHAPE_SCALE), [spawnPoint]);

  return (
    <group position={position}>
      <group rotation={tilt ?? [0, 0, 0]}>
        <group ref={spinRef}>
          <group scale={SHAPE_SCALE}>
            <mesh geometry={geometry} material={material} />
            {edges.map((e) => <Filament key={e.key} start={e.start} end={e.end} material={filament} />)}
            {/* Joint caps match the tube radius so corners read as one continuous line. */}
            {vertices.map((v, i) => (
              <mesh key={`v${i}`} position={v} material={filament}>
                <sphereGeometry args={[FILAMENT_RADIUS, 12, 12]} />
              </mesh>
            ))}
          </group>
          <FloatingBubbles animationTime={animationTime} color="#ffffff" opacityScale={0.6} spawnPoint={scaledSpawn} />
        </group>
      </group>
    </group>
  );
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

export default function Polyhedron({ vertices, edges, faces, spawnPoint, cameraPosition, fov = 60, position, tilt, active = true }) {
  const { dpr, lowerDpr } = useRenderDpr();
  const animationTime = useMemo(() => uniform(0), []);
  // Theme hook kept so the canvas re-renders on theme flips once light mode gets its own treatment.
  useThemeColor();

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas
        gl={createRenderer}
        dpr={dpr}
        frameloop={active ? 'always' : 'never'}
        camera={{ position: cameraPosition, fov }}
        style={{ background: 'transparent' }}
      >
        <RenderPolicyController active={active} lowerDpr={lowerDpr} animationTime={animationTime} />
        <CrystalShape
          animationTime={animationTime}
          vertices={vertices}
          edges={edges}
          faces={faces}
          spawnPoint={spawnPoint}
          position={position}
          tilt={tilt}
        />
        <Bloom />
        <OrbitControls enabled={active} enableZoom={false} enablePan={false} autoRotate={false} />
      </Canvas>
    </div>
  );
}

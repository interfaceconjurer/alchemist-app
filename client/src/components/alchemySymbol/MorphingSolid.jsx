import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three/webgpu';
import FloatingBubbles from './FloatingBubbles';
import { useThemeColor } from './useThemeColor';
import { Bloom, createRenderer, FILAMENT_RADIUS } from './Polyhedron';
import { createCrystalMaterial, createFilamentMaterial } from './crystal/crystalMaterial';
import { createStudioEnvironment } from './crystal/environment';
import { createHaloColorNode } from './crystal/backlight';
import { clamp, max, uniform, uv } from 'three/tsl';
import { intersectHalfspaces } from './morph/halfspace';
import { decodeMorphTables, createCompiledMorph } from './morph/compiledMorph';
import morphTablesUrl from './morph/morph-transitions.bin?url';
import { createPyramidGrow } from './morph/pyramidGrow';
import { SEQUENCE } from './morph/solids';
import RenderPolicyController from './RenderPolicyController';
import { animationDelta } from './renderPolicy';
import { useRenderDpr } from './useRenderDpr';
import { profileObserver } from './profileObserver';

// Preparing the fixed sequence is outside the frame loop. The hashed binary
// keeps thousands of coefficients out of JavaScript parsing and is shared once.
const tableResponse = await fetch(morphTablesUrl);
if (!tableResponse.ok) throw new Error('Unable to load crystal morph geometry.');
const morphTables = decodeMorphTables(await tableResponse.arrayBuffer());
if (morphTables.length !== SEQUENCE.length) throw new Error('Crystal morph sequence is inconsistent.');
const morphs = SEQUENCE.map((A, i) => createCompiledMorph(A, SEQUENCE[(i + 1) % SEQUENCE.length], morphTables[i]));
const restingSolids = SEQUENCE.map(solid => intersectHalfspaces(solid.planes));

const HOLD_MS = 5000; // time resting on each solid
const MORPH_MS = 2800; // time spent carving one solid into the next
// Intro, two stages with the same smoothstep ease as the morphs:
const BASE_MS = 1400; // 1. the square base spreads out of a point, flat
const RISE_MS = 2000; // 2. the apex lifts out of the base into the full pyramid
const RISE_OVERLAP_MS = 250; // start lifting just before the base finishes, so it flows
const GROW_MS = BASE_MS + RISE_MS - RISE_OVERLAP_MS;

const smoothstep01 = (x) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };

// Preallocated GPU buffers (WebGPU can't grow buffers in place).
const MAX_TRIANGLES = 512;
const MAX_EDGES = 192;
const MAX_JOINTS = 128;
const MIN_EDGE_LENGTH = 1e-3;

const UP = new THREE.Vector3(0, 1, 0);
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();

// Per-theme tuning. Light mode sits on mid grey (see theme.css --bg-color):
// the halo needs more presence to read as light on grey, and bubbles stay
// white but a touch more opaque so they don't vanish into the background.
// darkBubbles: share of bubbles that are dark onyx motes; darkBubbleOpacity:
// their strength (dark motes on a black page only show against the halo).
const THEME = {
  dark: { light: 0, halo: 0.32, bubbles: 0.6, bloom: 0.28, darkBubbles: 0.35, darkBubbleOpacity: 2.0 },
  light: { light: 1, halo: 0.34, bubbles: 0.7, bloom: 0.2, darkBubbles: 0.4, darkBubbleOpacity: 1.3 },
};

function MorphShape({ isDark, animationTime }) {
  const previousTime = useRef(animationTime.value);
  const look = isDark ? THEME.dark : THEME.light;
  const gl = useThree((s) => s.gl);
  const useWgsl = gl.backend?.isWebGPUBackend === true;

  const spinRef = useRef();
  const growElapsed = useRef(0);
  const pyramidGrow = useMemo(() => createPyramidGrow(restingSolids[0]), []);
  const meshRef = useRef();
  const edgesRef = useRef();
  const jointsRef = useRef();
  const polyRef = useRef(null);
  const clock = useRef({ index: 0, elapsed: 0, lastT: -1, cycle: 0 });
  const profileSimulationMs = useRef(0);

  const environment = useMemo(() => createStudioEnvironment(gl), [gl]);
  const envTexture = environment.texture;
  const uLight = useMemo(() => uniform(0), []);
  uLight.value = look.light;
  // Glass onyx: the far inner faces are drawn first, then the near faces are
  // drawn semi-transparent over them, so you see through the stone.
  const uClarity = useMemo(() => uniform(0.5), []);
  const { material } = useMemo(
    () => createCrystalMaterial({ envTexture, useWgsl, uLight, withEdges: true, transparent: true, uClarity, animationTime }),
    [envTexture, useWgsl, uLight, uClarity, animationTime],
  );
  const { material: innerMaterial } = useMemo(
    () => createCrystalMaterial({ envTexture, useWgsl, uLight, withEdges: false, side: THREE.BackSide, animationTime }),
    [envTexture, useWgsl, uLight, animationTime],
  );
  const filament = useMemo(() => createFilamentMaterial({ envTexture, uLight, animationTime }), [envTexture, uLight, animationTime]);
  const haloIntro = useMemo(() => uniform(0), []);
  const haloGain = useMemo(() => uniform(THEME.dark.halo), []);
  haloGain.value = look.halo;
  const halo = useMemo(() => {
    // Normal blending with alpha = glow brightness, so the card is fully
    // transparent where there's no light and composites over any page background.
    const m = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, depthTest: false });
    const glow = createHaloColorNode(uv(), 1, animationTime).mul(haloGain);
    // Alpha follows the glow's peak channel; colour is the glow normalised by it.
    // Clamping the divisor well above 0 keeps the faint outer fringe from
    // turning into noisy, over-saturated pixels on a light background.
    const strength = clamp(max(glow.r, max(glow.g, glow.b)), 0, 1);
    m.colorNode = glow.div(max(strength, 0.02));
    m.opacityNode = strength.mul(haloIntro);
    return m;
  }, [haloIntro, haloGain, animationTime]);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX_TRIANGLES * 9), 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(MAX_TRIANGLES * 9), 3).setUsage(THREE.DynamicDrawUsage));
    // Per-corner barycentric coords + which triangle sides are real polygon edges
    // (fan diagonals aren't). The onyx shader turns these into distance-to-edge,
    // so the fractured, glittery texture hugs the solid's edges like real stone.
    g.setAttribute('bary', new THREE.BufferAttribute(new Float32Array(MAX_TRIANGLES * 9), 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('edgeMask', new THREE.BufferAttribute(new Float32Array(MAX_TRIANGLES * 9), 3).setUsage(THREE.DynamicDrawUsage));
    g.setDrawRange(0, 0);
    // Static bounds: the morph never leaves the circumsphere.
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 3);
    return g;
  }, []);
  const edgeGeometry = useMemo(() => new THREE.CylinderGeometry(FILAMENT_RADIUS, FILAMENT_RADIUS, 1, 8, 1, true), []);
  const jointGeometry = useMemo(() => new THREE.SphereGeometry(FILAMENT_RADIUS, 12, 12), []);

  useEffect(() => () => {
    geometry.dispose(); edgeGeometry.dispose(); jointGeometry.dispose();
    material.dispose(); innerMaterial.dispose(); filament.dispose(); halo.dispose(); environment.dispose();
  }, [geometry, edgeGeometry, jointGeometry, material, innerMaterial, filament, halo, environment]);

  /** Write a polyhedron into the preallocated mesh + instanced filaments. */
  const writePoly = useCallback((poly) => {
    polyRef.current = poly;
    const { vertices, faces, edges } = poly;

    const pos = geometry.attributes.position.array;
    const nrm = geometry.attributes.normal.array;
    const bary = geometry.attributes.bary.array;
    const emask = geometry.attributes.edgeMask.array;
    let t = 0;
    for (const { normal, indices } of faces) {
      const last = indices.length - 2;
      for (let k = 1; k < indices.length - 1 && t < MAX_TRIANGLES; k++, t++) {
        const tri = [vertices[indices[0]], vertices[indices[k]], vertices[indices[k + 1]]];
        // Side opposite corner c is a real edge? (fan: side 0→k only for k=1,
        // side k→k+1 always, side (k+1)→0 only for the last triangle).
        const mask = [1, k === last ? 1 : 0, k === 1 ? 1 : 0];
        for (let c = 0; c < 3; c++) {
          pos.set(tri[c], t * 9 + c * 3);
          nrm.set(normal, t * 9 + c * 3);
          bary.set([c === 0 ? 1 : 0, c === 1 ? 1 : 0, c === 2 ? 1 : 0], t * 9 + c * 3);
          emask.set(mask, t * 9 + c * 3);
        }
      }
    }
    geometry.setDrawRange(0, t * 3);
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.normal.needsUpdate = true;
    geometry.attributes.bary.needsUpdate = true;
    geometry.attributes.edgeMask.needsUpdate = true;

    const edgeMesh = edgesRef.current;
    const used = new Set();
    let e = 0;
    for (const [i, j] of edges) {
      if (e >= MAX_EDGES) break;
      _a.fromArray(vertices[i]); _b.fromArray(vertices[j]);
      const length = _a.distanceTo(_b);
      if (length < MIN_EDGE_LENGTH) continue;
      used.add(i); used.add(j);
      _p.addVectors(_a, _b).multiplyScalar(0.5);
      _q.setFromUnitVectors(UP, _b.sub(_a).normalize());
      _s.set(1, length, 1);
      edgeMesh.setMatrixAt(e++, _m.compose(_p, _q, _s));
    }
    edgeMesh.count = e;
    edgeMesh.instanceMatrix.needsUpdate = true;

    const jointMesh = jointsRef.current;
    // Joints only where drawn edges meet, so no stray points float off the solid.
    _q.identity(); _s.set(1, 1, 1);
    let n = 0;
    for (const v of used) {
      if (n >= MAX_JOINTS) break;
      jointMesh.setMatrixAt(n++, _m.compose(_p.fromArray(vertices[v]), _q, _s));
    }
    jointMesh.count = n;
    jointMesh.instanceMatrix.needsUpdate = true;
  }, [geometry]);

  useEffect(() => { profileObserver?.sequence(SEQUENCE.map(solid => solid.name)); }, []);

  // First frame: the pyramid at (almost) zero size; the intro grows it.
  useEffect(() => {
    writePoly(pyramidGrow.at(0, 0));
  }, [writePoly, pyramidGrow]);

  useFrame((state, frameDelta) => {
    const delta = animationDelta(animationTime.value - previousTime.current);
    previousTime.current = animationTime.value;
    const started = profileObserver ? performance.now() : 0;
    const transitionIndex = clock.current.index;
    let phase = growElapsed.current < GROW_MS ? 'intro' : clock.current.elapsed + delta * 1000 < HOLD_MS ? 'hold' : 'morph';
    let progress = 0;
    let transitionComplete = false;
    if (profileObserver) profileSimulationMs.current += delta * 1000;
    try {
    if (spinRef.current) spinRef.current.rotation.y += delta * 0.5;

    // Intro: base spreads out flat, then the apex lifts out of it (see BASE_MS/RISE_MS).
    // The hold timer starts afterwards.
    if (growElapsed.current < GROW_MS) {
      growElapsed.current = Math.min(GROW_MS, growElapsed.current + delta * 1000);
      const ms = growElapsed.current;
      const base = smoothstep01(ms / BASE_MS);
      const rise = smoothstep01((ms - (BASE_MS - RISE_OVERLAP_MS)) / RISE_MS);
      writePoly(ms >= GROW_MS ? restingSolids[0] : pyramidGrow.at(base, rise));
      haloIntro.value = smoothstep01(ms / GROW_MS);
      return;
    }

    const c = clock.current;
    c.elapsed += delta * 1000;
    if (c.elapsed < HOLD_MS) return;

    const A = SEQUENCE[c.index];
    const B = SEQUENCE[(c.index + 1) % SEQUENCE.length];
    const t = Math.min(1, (c.elapsed - HOLD_MS) / MORPH_MS);
    progress = t;

    if (t >= 1) {
      c.index = (c.index + 1) % SEQUENCE.length;
      if (c.index === 0) c.cycle++;
      transitionComplete = true;
      c.elapsed = 0;
      c.lastT = -1;
      writePoly(restingSolids[c.index]);
      return;
    }
    if (t !== c.lastT) {
      c.lastT = t;
      writePoly(morphs[c.index].at(t));
    }
    } finally {
      profileObserver?.frame({
        at: performance.now(), delta: frameDelta,
        simulationMs: profileSimulationMs.current, phase, index: transitionIndex,
        from: SEQUENCE[transitionIndex].name, to: SEQUENCE[(transitionIndex + 1) % SEQUENCE.length].name,
        progress, cycle: clock.current.cycle, transitionComplete,
        cpuMorphMs: performance.now() - started,
        geometryMode: 'compiled',
        backend: gl.backend?.isWebGPUBackend === true ? 'webgpu' : 'webgl2',
        dpr: state.viewport.dpr, shaderTime: animationTime.value,
      });
    }
  });

  // Bubbles rise off whichever faces the current shape has, upward-facing first.
  const spawnPoint = useCallback(() => {
    const poly = polyRef.current;
    if (!poly || poly.faces.length === 0) return new THREE.Vector3();
    const upward = poly.faces.filter((f) => f.normal[1] > -0.2);
    const pool = upward.length ? upward : poly.faces;
    const face = pool[Math.floor(Math.random() * pool.length)];
    const k = 1 + Math.floor(Math.random() * (face.indices.length - 2));
    const a = new THREE.Vector3(...poly.vertices[face.indices[0]]);
    const b = new THREE.Vector3(...poly.vertices[face.indices[k]]);
    const cc = new THREE.Vector3(...poly.vertices[face.indices[k + 1]]);
    let u = Math.random(), v = Math.random();
    if (u + v > 1) { u = 1 - u; v = 1 - v; }
    return a.multiplyScalar(1 - u - v).add(b.multiplyScalar(u)).add(cc.multiplyScalar(v));
  }, []);

  return (
    <group position={[0, -0.3, 0]}>
      {/* Coloured glow behind the solid; doesn't spin, faces the camera's default view. */}
      <mesh position={[0, 0.25, -3.5]} material={halo} renderOrder={-10}>
        <planeGeometry args={[14, 14]} />
      </mesh>
      <group ref={spinRef}>
        <mesh geometry={geometry} material={innerMaterial} frustumCulled={false} renderOrder={0} />
        <mesh ref={meshRef} geometry={geometry} material={material} frustumCulled={false} renderOrder={1} />
        <instancedMesh ref={edgesRef} args={[edgeGeometry, filament, MAX_EDGES]} frustumCulled={false} />
        <instancedMesh ref={jointsRef} args={[jointGeometry, filament, MAX_JOINTS]} frustumCulled={false} />
        <FloatingBubbles
          animationTime={animationTime}
          color="#ffffff"
          opacityScale={look.bubbles}
          darkRatio={look.darkBubbles}
          darkOpacityScale={look.darkBubbleOpacity}
          spawnPoint={spawnPoint}
        />
      </group>
    </group>
  );
}

/** One persistent canvas; the solid carves itself into the next instead of cross-fading. */
export default function MorphingSolid({ active = true }) {
  const { isDark } = useThemeColor();
  const { dpr, lowerDpr } = useRenderDpr();
  const animationTime = useMemo(() => uniform(0), []);
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas gl={createRenderer} dpr={dpr} frameloop={active ? 'always' : 'never'} camera={{ position: [0, 1.2, 7.5], fov: 60 }} style={{ background: 'transparent' }}>
        <RenderPolicyController active={active} lowerDpr={lowerDpr} animationTime={animationTime} />
        <MorphShape isDark={isDark} animationTime={animationTime} />
        <Bloom strength={isDark ? THEME.dark.bloom : THEME.light.bloom} />
        <OrbitControls enabled={active} enableZoom={false} enablePan={false} autoRotate={false} />
      </Canvas>
    </div>
  );
}

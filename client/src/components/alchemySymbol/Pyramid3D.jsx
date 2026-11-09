import React, { useMemo, useCallback } from 'react';
import * as THREE from 'three';
import Polyhedron from './Polyhedron';

function randomBarycentric(a, b, c) {
  let u = Math.random(), v = Math.random();
  if (u + v > 1) { u = 1 - u; v = 1 - v; }
  return a.clone().multiplyScalar(1 - u - v).add(b.clone().multiplyScalar(u)).add(c.clone().multiplyScalar(v));
}

/** Square pyramid: four triangular sides on a square base (Great Pyramid proportions). */
export default function Pyramid3D({ active = true }) {
  const b = 1.8; // half base width
  const h = 2.3; // apex height above base (≈ 0.64 × base width, like Giza)
  const y0 = -h / 3; // keep the centroid near the origin so it spins in place

  const vertices = useMemo(() => [
    [0, y0 + h, 0], // 0 apex
    [-b, y0, -b], // 1
    [ b, y0, -b], // 2
    [ b, y0,  b], // 3
    [-b, y0,  b], // 4
  ], [b, h, y0]);

  const edges = useMemo(() => [
    { start: vertices[0], end: vertices[1], key: 'e01' },
    { start: vertices[0], end: vertices[2], key: 'e02' },
    { start: vertices[0], end: vertices[3], key: 'e03' },
    { start: vertices[0], end: vertices[4], key: 'e04' },
    { start: vertices[1], end: vertices[2], key: 'e12' },
    { start: vertices[2], end: vertices[3], key: 'e23' },
    { start: vertices[3], end: vertices[4], key: 'e34' },
    { start: vertices[4], end: vertices[1], key: 'e41' },
  ], [vertices]);

  const faces = useMemo(() => [
    { vertices: [vertices[0], vertices[1], vertices[2]], key: 'side-back' },
    { vertices: [vertices[0], vertices[2], vertices[3]], key: 'side-right' },
    { vertices: [vertices[0], vertices[3], vertices[4]], key: 'side-front' },
    { vertices: [vertices[0], vertices[4], vertices[1]], key: 'side-left' },
    { vertices: [vertices[1], vertices[2], vertices[3], vertices[4]], key: 'base' },
  ], [vertices]);

  // Bubbles rise off the four sloped sides.
  const spawnPoint = useCallback(() => {
    const sides = [[0, 1, 2], [0, 2, 3], [0, 3, 4], [0, 4, 1]];
    const f = sides[Math.floor(Math.random() * sides.length)];
    return randomBarycentric(
      new THREE.Vector3(...vertices[f[0]]),
      new THREE.Vector3(...vertices[f[1]]),
      new THREE.Vector3(...vertices[f[2]])
    );
  }, [vertices]);

  // Slight downward camera tilt so the base square reads as a square.
  return <Polyhedron active={active} vertices={vertices} edges={edges} faces={faces} spawnPoint={spawnPoint} cameraPosition={[0, 1.2, 7.5]} position={[0, -0.4, 0]} />;
}

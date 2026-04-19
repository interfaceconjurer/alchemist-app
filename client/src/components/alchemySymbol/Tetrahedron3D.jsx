import React, { useMemo, useCallback } from 'react';
import * as THREE from 'three';
import Polyhedron from './Polyhedron';

function randomBarycentric(a, b, c) {
  let u = Math.random(), v = Math.random();
  if (u + v > 1) { u = 1 - u; v = 1 - v; }
  return a.clone().multiplyScalar(1 - u - v).add(b.clone().multiplyScalar(u)).add(c.clone().multiplyScalar(v));
}

export default function Tetrahedron3D() {
  const s = 2.2;
  const vertices = useMemo(() => [
    [0, s, 0],
    [s * Math.sqrt(8 / 9), -s / 3, 0],
    [-s * Math.sqrt(2 / 9), -s / 3, s * Math.sqrt(2 / 3)],
    [-s * Math.sqrt(2 / 9), -s / 3, -s * Math.sqrt(2 / 3)]
  ], []);

  const edges = useMemo(() => [
    { start: vertices[0], end: vertices[1], key: 'e01' },
    { start: vertices[0], end: vertices[2], key: 'e02' },
    { start: vertices[0], end: vertices[3], key: 'e03' },
    { start: vertices[1], end: vertices[2], key: 'e12' },
    { start: vertices[1], end: vertices[3], key: 'e13' },
    { start: vertices[2], end: vertices[3], key: 'e23' },
  ], [vertices]);

  const faces = useMemo(() => [
    { vertices: [vertices[0], vertices[1], vertices[2]], key: 'f012' },
    { vertices: [vertices[0], vertices[1], vertices[3]], key: 'f013' },
    { vertices: [vertices[0], vertices[2], vertices[3]], key: 'f023' },
    { vertices: [vertices[1], vertices[2], vertices[3]], key: 'f123' },
  ], [vertices]);

  const spawnPoint = useCallback(() => {
    const faceIndices = [[0,1,2],[0,1,3],[0,2,3]];
    const face = faceIndices[Math.floor(Math.random() * faceIndices.length)];
    return randomBarycentric(
      new THREE.Vector3(...vertices[face[0]]),
      new THREE.Vector3(...vertices[face[1]]),
      new THREE.Vector3(...vertices[face[2]])
    );
  }, [vertices]);

  return <Polyhedron vertices={vertices} edges={edges} faces={faces} spawnPoint={spawnPoint} cameraPosition={[0, -1.5, 7]} />;
}

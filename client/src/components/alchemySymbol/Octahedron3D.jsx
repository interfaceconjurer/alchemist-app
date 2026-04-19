import React, { useMemo, useCallback } from 'react';
import * as THREE from 'three';
import Polyhedron from './Polyhedron';

function randomBarycentric(a, b, c) {
  let u = Math.random(), v = Math.random();
  if (u + v > 1) { u = 1 - u; v = 1 - v; }
  return a.clone().multiplyScalar(1 - u - v).add(b.clone().multiplyScalar(u)).add(c.clone().multiplyScalar(v));
}

export default function Octahedron3D() {
  const s = 2;
  const vertices = useMemo(() => [
    [0,  s, 0], [ s, 0, 0], [0, 0, s],
    [-s, 0, 0], [0, 0, -s], [0, -s, 0],
  ], []);

  const edges = useMemo(() => [
    { start: vertices[0], end: vertices[1], key: 'e01' },
    { start: vertices[0], end: vertices[2], key: 'e02' },
    { start: vertices[0], end: vertices[3], key: 'e03' },
    { start: vertices[0], end: vertices[4], key: 'e04' },
    { start: vertices[1], end: vertices[2], key: 'e12' },
    { start: vertices[2], end: vertices[3], key: 'e23' },
    { start: vertices[3], end: vertices[4], key: 'e34' },
    { start: vertices[4], end: vertices[1], key: 'e41' },
    { start: vertices[5], end: vertices[1], key: 'e51' },
    { start: vertices[5], end: vertices[2], key: 'e52' },
    { start: vertices[5], end: vertices[3], key: 'e53' },
    { start: vertices[5], end: vertices[4], key: 'e54' },
  ], [vertices]);

  const faces = useMemo(() => [
    { vertices: [vertices[0], vertices[1], vertices[2]], key: 'f012' },
    { vertices: [vertices[0], vertices[2], vertices[3]], key: 'f023' },
    { vertices: [vertices[0], vertices[3], vertices[4]], key: 'f034' },
    { vertices: [vertices[0], vertices[4], vertices[1]], key: 'f041' },
    { vertices: [vertices[5], vertices[2], vertices[1]], key: 'f521' },
    { vertices: [vertices[5], vertices[3], vertices[2]], key: 'f532' },
    { vertices: [vertices[5], vertices[4], vertices[3]], key: 'f543' },
    { vertices: [vertices[5], vertices[1], vertices[4]], key: 'f514' },
  ], [vertices]);

  const spawnPoint = useCallback(() => {
    const topFaces = [[0,1,2],[0,2,3],[0,3,4],[0,4,1]];
    const face = topFaces[Math.floor(Math.random() * topFaces.length)];
    return randomBarycentric(
      new THREE.Vector3(...vertices[face[0]]),
      new THREE.Vector3(...vertices[face[1]]),
      new THREE.Vector3(...vertices[face[2]])
    );
  }, [vertices]);

  return <Polyhedron vertices={vertices} edges={edges} faces={faces} spawnPoint={spawnPoint} cameraPosition={[0, -1.5, 7]} fov={70} />;
}

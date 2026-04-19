import React, { useMemo, useCallback } from 'react';
import * as THREE from 'three';
import Polyhedron from './Polyhedron';

function randomBarycentric(a, b, c) {
  let u = Math.random(), v = Math.random();
  if (u + v > 1) { u = 1 - u; v = 1 - v; }
  return a.clone().multiplyScalar(1 - u - v).add(b.clone().multiplyScalar(u)).add(c.clone().multiplyScalar(v));
}

export default function Icosahedron3D() {
  const s = 1.4;
  const phi = (1 + Math.sqrt(5)) / 2;

  const vertices = useMemo(() => [
    [0,  s,  s * phi], [0,  s, -s * phi], [0, -s,  s * phi], [0, -s, -s * phi],
    [ s * phi, 0,  s], [ s * phi, 0, -s], [-s * phi, 0,  s], [-s * phi, 0, -s],
    [ s,  s * phi, 0], [-s,  s * phi, 0], [ s, -s * phi, 0], [-s, -s * phi, 0],
  ], []);

  const edges = useMemo(() => [
    { start: vertices[0], end: vertices[2], key: 'e0-2' },
    { start: vertices[0], end: vertices[4], key: 'e0-4' },
    { start: vertices[0], end: vertices[6], key: 'e0-6' },
    { start: vertices[0], end: vertices[8], key: 'e0-8' },
    { start: vertices[0], end: vertices[9], key: 'e0-9' },
    { start: vertices[1], end: vertices[3], key: 'e1-3' },
    { start: vertices[1], end: vertices[5], key: 'e1-5' },
    { start: vertices[1], end: vertices[7], key: 'e1-7' },
    { start: vertices[1], end: vertices[8], key: 'e1-8' },
    { start: vertices[1], end: vertices[9], key: 'e1-9' },
    { start: vertices[2], end: vertices[4], key: 'e2-4' },
    { start: vertices[2], end: vertices[6], key: 'e2-6' },
    { start: vertices[2], end: vertices[10], key: 'e2-10' },
    { start: vertices[2], end: vertices[11], key: 'e2-11' },
    { start: vertices[3], end: vertices[5], key: 'e3-5' },
    { start: vertices[3], end: vertices[7], key: 'e3-7' },
    { start: vertices[3], end: vertices[10], key: 'e3-10' },
    { start: vertices[3], end: vertices[11], key: 'e3-11' },
    { start: vertices[4], end: vertices[5], key: 'e4-5' },
    { start: vertices[4], end: vertices[8], key: 'e4-8' },
    { start: vertices[4], end: vertices[10], key: 'e4-10' },
    { start: vertices[5], end: vertices[8], key: 'e5-8' },
    { start: vertices[5], end: vertices[10], key: 'e5-10' },
    { start: vertices[6], end: vertices[7], key: 'e6-7' },
    { start: vertices[6], end: vertices[9], key: 'e6-9' },
    { start: vertices[6], end: vertices[11], key: 'e6-11' },
    { start: vertices[7], end: vertices[9], key: 'e7-9' },
    { start: vertices[7], end: vertices[11], key: 'e7-11' },
    { start: vertices[8], end: vertices[9], key: 'e8-9' },
    { start: vertices[10], end: vertices[11], key: 'e10-11' },
  ], [vertices]);

  const faces = useMemo(() => [
    { vertices: [vertices[0], vertices[2], vertices[4]], key: 'f0' },
    { vertices: [vertices[0], vertices[4], vertices[8]], key: 'f1' },
    { vertices: [vertices[0], vertices[8], vertices[9]], key: 'f2' },
    { vertices: [vertices[0], vertices[9], vertices[6]], key: 'f3' },
    { vertices: [vertices[0], vertices[6], vertices[2]], key: 'f4' },
    { vertices: [vertices[2], vertices[4], vertices[10]], key: 'f5' },
    { vertices: [vertices[4], vertices[8], vertices[5]], key: 'f6' },
    { vertices: [vertices[8], vertices[9], vertices[1]], key: 'f7' },
    { vertices: [vertices[9], vertices[6], vertices[7]], key: 'f8' },
    { vertices: [vertices[6], vertices[2], vertices[11]], key: 'f9' },
    { vertices: [vertices[10], vertices[4], vertices[5]], key: 'f10' },
    { vertices: [vertices[5], vertices[8], vertices[1]], key: 'f11' },
    { vertices: [vertices[1], vertices[9], vertices[7]], key: 'f12' },
    { vertices: [vertices[7], vertices[6], vertices[11]], key: 'f13' },
    { vertices: [vertices[11], vertices[2], vertices[10]], key: 'f14' },
    { vertices: [vertices[3], vertices[10], vertices[5]], key: 'f15' },
    { vertices: [vertices[3], vertices[5], vertices[1]], key: 'f16' },
    { vertices: [vertices[3], vertices[1], vertices[7]], key: 'f17' },
    { vertices: [vertices[3], vertices[7], vertices[11]], key: 'f18' },
    { vertices: [vertices[3], vertices[11], vertices[10]], key: 'f19' },
  ], [vertices]);

  const topFaceIndices = [0, 1, 2, 3, 4];

  const spawnPoint = useCallback(() => {
    const faceIdx = topFaceIndices[Math.floor(Math.random() * topFaceIndices.length)];
    const fv = faces[faceIdx].vertices;
    return randomBarycentric(
      new THREE.Vector3(...fv[0]),
      new THREE.Vector3(...fv[1]),
      new THREE.Vector3(...fv[2])
    );
  }, [faces]);

  return <Polyhedron vertices={vertices} edges={edges} faces={faces} spawnPoint={spawnPoint} cameraPosition={[0, 2, 7]} fov={80} position={[0, -2, 0]} />;
}

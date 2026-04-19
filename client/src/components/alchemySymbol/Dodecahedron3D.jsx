import React, { useMemo, useCallback } from 'react';
import * as THREE from 'three';
import Polyhedron from './Polyhedron';

function randomBarycentric(a, b, c) {
  let u = Math.random(), v = Math.random();
  if (u + v > 1) { u = 1 - u; v = 1 - v; }
  return a.clone().multiplyScalar(1 - u - v).add(b.clone().multiplyScalar(u)).add(c.clone().multiplyScalar(v));
}

export default function Dodecahedron3D() {
  const s = 1.2;
  const phi = (1 + Math.sqrt(5)) / 2;
  const invPhi = 1 / phi;

  const vertices = useMemo(() => [
    [ s,  s,  s], [ s,  s, -s], [ s, -s,  s], [ s, -s, -s],
    [-s,  s,  s], [-s,  s, -s], [-s, -s,  s], [-s, -s, -s],
    [0,  s * invPhi,  s * phi], [0, -s * invPhi,  s * phi],
    [0,  s * invPhi, -s * phi], [0, -s * invPhi, -s * phi],
    [ s * invPhi,  s * phi, 0], [-s * invPhi,  s * phi, 0],
    [ s * invPhi, -s * phi, 0], [-s * invPhi, -s * phi, 0],
    [ s * phi, 0,  s * invPhi], [-s * phi, 0,  s * invPhi],
    [ s * phi, 0, -s * invPhi], [-s * phi, 0, -s * invPhi],
  ], []);

  const edges = useMemo(() => [
    { start: vertices[0], end: vertices[8], key: 'e0-8' },
    { start: vertices[0], end: vertices[12], key: 'e0-12' },
    { start: vertices[0], end: vertices[16], key: 'e0-16' },
    { start: vertices[1], end: vertices[10], key: 'e1-10' },
    { start: vertices[1], end: vertices[12], key: 'e1-12' },
    { start: vertices[1], end: vertices[18], key: 'e1-18' },
    { start: vertices[2], end: vertices[9], key: 'e2-9' },
    { start: vertices[2], end: vertices[14], key: 'e2-14' },
    { start: vertices[2], end: vertices[16], key: 'e2-16' },
    { start: vertices[3], end: vertices[11], key: 'e3-11' },
    { start: vertices[3], end: vertices[14], key: 'e3-14' },
    { start: vertices[3], end: vertices[18], key: 'e3-18' },
    { start: vertices[4], end: vertices[8], key: 'e4-8' },
    { start: vertices[4], end: vertices[13], key: 'e4-13' },
    { start: vertices[4], end: vertices[17], key: 'e4-17' },
    { start: vertices[5], end: vertices[10], key: 'e5-10' },
    { start: vertices[5], end: vertices[13], key: 'e5-13' },
    { start: vertices[5], end: vertices[19], key: 'e5-19' },
    { start: vertices[6], end: vertices[9], key: 'e6-9' },
    { start: vertices[6], end: vertices[15], key: 'e6-15' },
    { start: vertices[6], end: vertices[17], key: 'e6-17' },
    { start: vertices[7], end: vertices[11], key: 'e7-11' },
    { start: vertices[7], end: vertices[15], key: 'e7-15' },
    { start: vertices[7], end: vertices[19], key: 'e7-19' },
    { start: vertices[8], end: vertices[9], key: 'e8-9' },
    { start: vertices[10], end: vertices[11], key: 'e10-11' },
    { start: vertices[12], end: vertices[13], key: 'e12-13' },
    { start: vertices[14], end: vertices[15], key: 'e14-15' },
    { start: vertices[16], end: vertices[18], key: 'e16-18' },
    { start: vertices[17], end: vertices[19], key: 'e17-19' },
  ], [vertices]);

  const faces = useMemo(() => [
    { vertices: [vertices[0], vertices[16], vertices[2], vertices[9], vertices[8]], key: 'f0' },
    { vertices: [vertices[0], vertices[8], vertices[4], vertices[13], vertices[12]], key: 'f1' },
    { vertices: [vertices[0], vertices[12], vertices[1], vertices[18], vertices[16]], key: 'f2' },
    { vertices: [vertices[8], vertices[9], vertices[6], vertices[17], vertices[4]], key: 'f3' },
    { vertices: [vertices[2], vertices[16], vertices[18], vertices[3], vertices[14]], key: 'f4' },
    { vertices: [vertices[1], vertices[12], vertices[13], vertices[5], vertices[10]], key: 'f5' },
    { vertices: [vertices[4], vertices[17], vertices[19], vertices[5], vertices[13]], key: 'f6' },
    { vertices: [vertices[2], vertices[14], vertices[15], vertices[6], vertices[9]], key: 'f7' },
    { vertices: [vertices[1], vertices[10], vertices[11], vertices[3], vertices[18]], key: 'f8' },
    { vertices: [vertices[6], vertices[15], vertices[7], vertices[19], vertices[17]], key: 'f9' },
    { vertices: [vertices[3], vertices[11], vertices[7], vertices[15], vertices[14]], key: 'f10' },
    { vertices: [vertices[5], vertices[19], vertices[7], vertices[11], vertices[10]], key: 'f11' },
  ], [vertices]);

  const topFaceIndices = [1, 5];

  const spawnPoint = useCallback(() => {
    const faceIdx = topFaceIndices[Math.floor(Math.random() * topFaceIndices.length)];
    const fv = faces[faceIdx].vertices;
    const triIdx = Math.floor(Math.random() * 3);
    return randomBarycentric(
      new THREE.Vector3(...fv[0]),
      new THREE.Vector3(...fv[triIdx + 1]),
      new THREE.Vector3(...fv[triIdx + 2])
    );
  }, [faces]);

  return <Polyhedron vertices={vertices} edges={edges} faces={faces} spawnPoint={spawnPoint} cameraPosition={[0, 4, 7]} />;
}

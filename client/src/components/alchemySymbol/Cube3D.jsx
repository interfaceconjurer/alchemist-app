import React, { useMemo, useCallback } from 'react';
import * as THREE from 'three';
import Polyhedron from './Polyhedron';

export default function Cube3D() {
  const s = 1.5;
  const vertices = useMemo(() => [
    [-s, -s, -s], [ s, -s, -s], [ s,  s, -s], [-s,  s, -s],
    [-s, -s,  s], [ s, -s,  s], [ s,  s,  s], [-s,  s,  s],
  ], []);

  const edges = useMemo(() => [
    { start: vertices[0], end: vertices[1], key: 'e01' },
    { start: vertices[1], end: vertices[5], key: 'e15' },
    { start: vertices[5], end: vertices[4], key: 'e54' },
    { start: vertices[4], end: vertices[0], key: 'e40' },
    { start: vertices[3], end: vertices[2], key: 'e32' },
    { start: vertices[2], end: vertices[6], key: 'e26' },
    { start: vertices[6], end: vertices[7], key: 'e67' },
    { start: vertices[7], end: vertices[3], key: 'e73' },
    { start: vertices[0], end: vertices[3], key: 'e03' },
    { start: vertices[1], end: vertices[2], key: 'e12' },
    { start: vertices[5], end: vertices[6], key: 'e56' },
    { start: vertices[4], end: vertices[7], key: 'e47' },
  ], [vertices]);

  const faces = useMemo(() => [
    { vertices: [vertices[0], vertices[1], vertices[2], vertices[3]], key: 'back' },
    { vertices: [vertices[4], vertices[5], vertices[6], vertices[7]], key: 'front' },
    { vertices: [vertices[3], vertices[2], vertices[6], vertices[7]], key: 'top' },
    { vertices: [vertices[0], vertices[1], vertices[5], vertices[4]], key: 'bottom' },
    { vertices: [vertices[0], vertices[3], vertices[7], vertices[4]], key: 'left' },
    { vertices: [vertices[1], vertices[2], vertices[6], vertices[5]], key: 'right' },
  ], [vertices]);

  const spawnPoint = useCallback(() => {
    const topVerts = [vertices[2], vertices[3], vertices[6], vertices[7]];
    const a = new THREE.Vector3(...topVerts[0]);
    const b = new THREE.Vector3(...topVerts[1]);
    const c = new THREE.Vector3(...topVerts[2]);
    const d = new THREE.Vector3(...topVerts[3]);
    const u = Math.random(), v = Math.random();
    return a.clone().lerp(b, u).lerp(d.clone().lerp(c, u), v);
  }, [vertices]);

  return <Polyhedron vertices={vertices} edges={edges} faces={faces} spawnPoint={spawnPoint} cameraPosition={[0, 2, 9]} />;
}

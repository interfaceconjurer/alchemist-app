import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import * as THREE from 'three';

export default function Edge({ start, end, color, lineWidth = 2, opacity = 0.9 }) {
  const points = useMemo(() => [
    new THREE.Vector3(...start),
    new THREE.Vector3(...end)
  ], [start, end]);

  return <Line points={points} color={color} lineWidth={lineWidth} opacity={opacity} transparent />;
}

import { useMemo } from 'react';
import * as THREE from 'three';

export default function Face({ vertices, color, opacity = 0, emissive, emissiveIntensity, side = THREE.DoubleSide }) {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = [];
    for (let i = 1; i < vertices.length - 1; i++) {
      positions.push(...vertices[0], ...vertices[i], ...vertices[i + 1]);
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.computeVertexNormals();
    return geo;
  }, [vertices]);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color={color}
        transparent
        opacity={opacity}
        side={side}
        depthWrite={false}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
      />
    </mesh>
  );
}

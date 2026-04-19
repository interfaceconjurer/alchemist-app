import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import Edge from './Edge';
import Face from './Face';

function FlowerOfLifePattern() {
  const group = useRef();

  useFrame((state) => {
    if (group.current) {
      group.current.rotation.y += 0.003;
      group.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.1;
    }
  });

  const vertices = useMemo(() => {
    const positions = [];
    const radius = 1.5;

    positions.push([0, 0, 0]);

    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI * 2) / 6;
      positions.push([Math.cos(angle) * radius, Math.sin(angle) * radius, 0]);
    }

    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI * 2) / 6 + Math.PI / 6;
      positions.push([Math.cos(angle) * radius * 1.732, Math.sin(angle) * radius * 1.732, 0]);
    }

    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI * 2) / 6;
      positions.push([Math.cos(angle) * radius * 0.866, Math.sin(angle) * radius * 0.866, radius]);
    }

    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI * 2) / 6 + Math.PI / 6;
      positions.push([Math.cos(angle) * radius * 0.866, Math.sin(angle) * radius * 0.866, -radius]);
    }

    return positions;
  }, []);

  const connections = useMemo(() => {
    const lines = [];

    for (let i = 1; i <= 6; i++) {
      lines.push({ start: vertices[0], end: vertices[i], key: `center-ring1-${i}` });
    }

    for (let i = 1; i <= 6; i++) {
      const next = i === 6 ? 1 : i + 1;
      lines.push({ start: vertices[i], end: vertices[next], key: `ring1-${i}-${next}` });
    }

    for (let i = 7; i <= 12; i++) {
      const next = i === 12 ? 7 : i + 1;
      lines.push({ start: vertices[i], end: vertices[next], key: `ring2-${i}-${next}` });
    }

    for (let i = 1; i <= 6; i++) {
      const outerIdx1 = i + 6;
      const outerIdx2 = i === 6 ? 7 : i + 7;
      lines.push({ start: vertices[i], end: vertices[outerIdx1], key: `cross-${i}-${outerIdx1}` });
      lines.push({ start: vertices[i], end: vertices[outerIdx2], key: `cross-${i}-${outerIdx2}` });
    }

    for (let i = 13; i <= 18; i++) {
      lines.push({ start: vertices[0], end: vertices[i], key: `center-top-${i}` });
      const next = i === 18 ? 13 : i + 1;
      lines.push({ start: vertices[i], end: vertices[next], key: `top-hex-${i}-${next}` });
    }

    for (let i = 19; i <= 24; i++) {
      lines.push({ start: vertices[0], end: vertices[i], key: `center-bottom-${i}` });
      const next = i === 24 ? 19 : i + 1;
      lines.push({ start: vertices[i], end: vertices[next], key: `bottom-hex-${i}-${next}` });
    }

    for (let i = 1; i <= 6; i++) {
      const topIdx = i + 12;
      const bottomIdx = i + 18;
      lines.push({ start: vertices[i], end: vertices[topIdx], key: `vertical-${i}-${topIdx}` });
      if (bottomIdx <= 24) {
        lines.push({ start: vertices[i], end: vertices[bottomIdx], key: `vertical-${i}-${bottomIdx}` });
      }
    }

    return lines;
  }, [vertices]);

  const filledPlanes = useMemo(() => {
    const planes = [];

    for (let i = 1; i <= 6; i++) {
      const next = i === 6 ? 1 : i + 1;
      planes.push({ vertices: [vertices[0], vertices[i], vertices[next]], key: `center-tri-${i}` });
    }

    for (let i = 1; i <= 6; i++) {
      const next = i === 6 ? 1 : i + 1;
      planes.push({ vertices: [vertices[i], vertices[next], vertices[i + 6]], key: `ring-tri-${i}` });
    }

    for (let i = 13; i <= 18; i++) {
      const next = i === 18 ? 13 : i + 1;
      planes.push({ vertices: [vertices[0], vertices[i], vertices[next]], key: `top-tri-${i}` });
    }

    for (let i = 19; i <= 24; i++) {
      const next = i === 24 ? 19 : i + 1;
      planes.push({ vertices: [vertices[0], vertices[i], vertices[next]], key: `bottom-tri-${i}` });
    }

    for (let i = 1; i <= 6; i++) {
      const topIdx = i + 12;
      const next = i === 6 ? 1 : i + 1;
      const topNext = topIdx === 18 ? 13 : topIdx + 1;
      planes.push({ vertices: [vertices[i], vertices[next], vertices[topIdx]], key: `vertical-tri-${i}-1` });
      planes.push({ vertices: [vertices[next], vertices[topNext], vertices[topIdx]], key: `vertical-tri-${i}-2` });
    }

    return planes;
  }, [vertices]);

  return (
    <group ref={group}>
      {filledPlanes.map((p) => (
        <Face key={p.key} vertices={p.vertices} color="#000000" opacity={0.1} />
      ))}
      {connections.map((c) => (
        <Edge key={c.key} start={c.start} end={c.end} color="#000000" lineWidth={1.5} opacity={0.8} />
      ))}
    </group>
  );
}

export default function GeometricFlowerOfLife3D() {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas camera={{ position: [8, 6, 10], fov: 50 }} style={{ background: 'transparent' }}>
        <ambientLight intensity={0.6} />
        <pointLight position={[10, 10, 10]} intensity={0.8} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={0.6} color="#FFFFFF" />
        <FlowerOfLifePattern />
        <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} maxPolarAngle={Math.PI} minPolarAngle={0} />
      </Canvas>
    </div>
  );
}

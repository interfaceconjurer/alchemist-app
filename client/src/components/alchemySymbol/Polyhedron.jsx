import React, { useRef, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useThemeColor } from './useThemeColor';
import Edge from './Edge';
import Face from './Face';
import FloatingBubbles from './FloatingBubbles';

function PolyhedronShape({ shapeColor, vertices, edges, faces, spawnPoint, position = [0, -1.5, 0], tilt }) {
  const spinRef = useRef();

  useFrame(() => {
    if (spinRef.current) spinRef.current.rotation.y += 0.01;
  });

  const inner = (
    <>
      {faces.map((f) => <Face key={f.key} vertices={f.vertices} color={shapeColor} />)}
      {edges.map((e) => <Edge key={e.key} start={e.start} end={e.end} color={shapeColor} />)}
      {vertices.map((v, i) => (
        <mesh key={`v${i}`} position={v}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshStandardMaterial color={shapeColor} />
        </mesh>
      ))}
      <FloatingBubbles color={shapeColor} spawnPoint={spawnPoint} />
    </>
  );

  if (tilt) {
    return (
      <group position={position}>
        <group rotation={tilt}>
          <group ref={spinRef}>{inner}</group>
        </group>
      </group>
    );
  }

  return <group ref={spinRef} position={position}>{inner}</group>;
}

export default function Polyhedron({ vertices, edges, faces, spawnPoint, cameraPosition, fov = 60, position, tilt }) {
  const { shapeColor } = useThemeColor();

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas camera={{ position: cameraPosition, fov }} style={{ background: 'transparent' }}>
        <ambientLight intensity={0.5} color="#ffffff" />
        <directionalLight position={[5, 5, 5]} intensity={0.5} color="#ffffff" />
        <PolyhedronShape
          shapeColor={shapeColor}
          vertices={vertices}
          edges={edges}
          faces={faces}
          spawnPoint={spawnPoint}
          position={position}
          tilt={tilt}
        />
        <OrbitControls enableZoom={false} enablePan={false} autoRotate={false} />
      </Canvas>
    </div>
  );
}

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line } from '@react-three/drei';
import * as THREE from 'three';

// Create a sphere for each vertex point
function Sphere({ position, radius = 0.15 }) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[radius, 32, 16]} />
      <meshStandardMaterial
        color="#000000"
        metalness={0.3}
        roughness={0.4}
        emissive="#000000"
        emissiveIntensity={0.2}
      />
    </mesh>
  );
}

// Create connecting lines between points
function ConnectionLine({ start, end, color = "#000000", opacity = 0.8 }) {
  const points = useMemo(() => [
    new THREE.Vector3(...start),
    new THREE.Vector3(...end)
  ], [start, end]);

  return (
    <Line
      points={points}
      color={color}
      lineWidth={1.5}
      opacity={opacity}
      transparent
    />
  );
}

// Create filled geometric planes
function FilledPlane({ vertices, color = "#000000", opacity = 0.1 }) {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const verts = new Float32Array(vertices.flat());
    geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    geo.computeVertexNormals();
    return geo;
  }, [vertices]);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color={color}
        transparent
        opacity={opacity}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

// Main Flower of Life pattern component
function FlowerOfLifePattern() {
  const group = useRef();

  // Rotate the entire pattern
  useFrame((state) => {
    if (group.current) {
      group.current.rotation.y += 0.003;
      group.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.1;
    }
  });

  // Generate positions for spheres in 3D Flower of Life pattern
  const vertices = useMemo(() => {
    const positions = [];
    const radius = 1.5;

    // Center sphere
    positions.push([0, 0, 0]);

    // First ring - 6 spheres in hexagon pattern (XY plane)
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI * 2) / 6;
      positions.push([
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        0
      ]);
    }

    // Second ring - 6 spheres offset by 30 degrees (XY plane)
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI * 2) / 6 + Math.PI / 6;
      positions.push([
        Math.cos(angle) * radius * 1.732,
        Math.sin(angle) * radius * 1.732,
        0
      ]);
    }

    // Top layer - 6 spheres (above center)
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI * 2) / 6;
      positions.push([
        Math.cos(angle) * radius * 0.866,
        Math.sin(angle) * radius * 0.866,
        radius
      ]);
    }

    // Bottom layer - 6 spheres (below center)
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI * 2) / 6 + Math.PI / 6;
      positions.push([
        Math.cos(angle) * radius * 0.866,
        Math.sin(angle) * radius * 0.866,
        -radius
      ]);
    }

    return positions;
  }, []);

  // Create connection lines
  const connections = useMemo(() => {
    const lines = [];

    // Connect center to first ring
    for (let i = 1; i <= 6; i++) {
      lines.push({
        start: vertices[0],
        end: vertices[i],
        key: `center-ring1-${i}`
      });
    }

    // Connect first ring to each other (hexagon)
    for (let i = 1; i <= 6; i++) {
      const next = i === 6 ? 1 : i + 1;
      lines.push({
        start: vertices[i],
        end: vertices[next],
        key: `ring1-${i}-${next}`
      });
    }

    // Connect second ring to each other
    for (let i = 7; i <= 12; i++) {
      const next = i === 12 ? 7 : i + 1;
      lines.push({
        start: vertices[i],
        end: vertices[next],
        key: `ring2-${i}-${next}`
      });
    }

    // Connect first ring to second ring
    for (let i = 1; i <= 6; i++) {
      const outerIdx1 = i + 6;
      const outerIdx2 = i === 6 ? 7 : i + 7;

      lines.push({
        start: vertices[i],
        end: vertices[outerIdx1],
        key: `cross-${i}-${outerIdx1}`
      });

      lines.push({
        start: vertices[i],
        end: vertices[outerIdx2],
        key: `cross-${i}-${outerIdx2}`
      });
    }

    // Connect to top layer
    for (let i = 13; i <= 18; i++) {
      // Connect to center
      lines.push({
        start: vertices[0],
        end: vertices[i],
        key: `center-top-${i}`
      });

      // Connect top layer in hexagon
      const next = i === 18 ? 13 : i + 1;
      lines.push({
        start: vertices[i],
        end: vertices[next],
        key: `top-hex-${i}-${next}`
      });
    }

    // Connect to bottom layer
    for (let i = 19; i <= 24; i++) {
      // Connect to center
      lines.push({
        start: vertices[0],
        end: vertices[i],
        key: `center-bottom-${i}`
      });

      // Connect bottom layer in hexagon
      const next = i === 24 ? 19 : i + 1;
      lines.push({
        start: vertices[i],
        end: vertices[next],
        key: `bottom-hex-${i}-${next}`
      });
    }

    // Cross connections between layers
    for (let i = 1; i <= 6; i++) {
      const topIdx = i + 12;
      const bottomIdx = i + 18;

      lines.push({
        start: vertices[i],
        end: vertices[topIdx],
        key: `vertical-${i}-${topIdx}`
      });

      if (bottomIdx <= 24) {
        lines.push({
          start: vertices[i],
          end: vertices[bottomIdx],
          key: `vertical-${i}-${bottomIdx}`
        });
      }
    }

    return lines;
  }, [vertices]);

  // Create filled triangular planes
  const filledPlanes = useMemo(() => {
    const planes = [];

    // Center triangles to first ring
    for (let i = 1; i <= 6; i++) {
      const next = i === 6 ? 1 : i + 1;
      planes.push({
        vertices: [vertices[0], vertices[i], vertices[next]],
        key: `center-tri-${i}`
      });
    }

    // Triangles in first ring to second ring
    for (let i = 1; i <= 6; i++) {
      const next = i === 6 ? 1 : i + 1;
      const outerIdx = i + 6;

      planes.push({
        vertices: [vertices[i], vertices[next], vertices[outerIdx]],
        key: `ring-tri-${i}`
      });
    }

    // Top layer triangles
    for (let i = 13; i <= 18; i++) {
      const next = i === 18 ? 13 : i + 1;
      planes.push({
        vertices: [vertices[0], vertices[i], vertices[next]],
        key: `top-tri-${i}`
      });
    }

    // Bottom layer triangles
    for (let i = 19; i <= 24; i++) {
      const next = i === 24 ? 19 : i + 1;
      planes.push({
        vertices: [vertices[0], vertices[i], vertices[next]],
        key: `bottom-tri-${i}`
      });
    }

    // Vertical triangular planes connecting layers
    for (let i = 1; i <= 6; i++) {
      const topIdx = i + 12;
      const next = i === 6 ? 1 : i + 1;
      const topNext = topIdx === 18 ? 13 : topIdx + 1;

      planes.push({
        vertices: [vertices[i], vertices[next], vertices[topIdx]],
        key: `vertical-tri-${i}-1`
      });

      planes.push({
        vertices: [vertices[next], vertices[topNext], vertices[topIdx]],
        key: `vertical-tri-${i}-2`
      });
    }

    return planes;
  }, [vertices]);

  return (
    <group ref={group}>
      {/* Render filled planes first (behind everything) */}
      {filledPlanes.map((plane) => (
        <FilledPlane
          key={plane.key}
          vertices={plane.vertices}
          color="#000000"
          opacity={0.1}
        />
      ))}

      {/* Render connection lines */}
      {connections.map((conn) => (
        <ConnectionLine
          key={conn.key}
          start={conn.start}
          end={conn.end}
          opacity={0.8}
        />
      ))}
    </group>
  );
}

// Main component that sets up the 3D scene
function GeometricFlowerOfLife3D() {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas
        camera={{ position: [8, 6, 10], fov: 50 }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.6} />
        <pointLight position={[10, 10, 10]} intensity={0.8} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={0.6} color="#FFFFFF" />

        <FlowerOfLifePattern />

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate={true}
          autoRotateSpeed={0.5}
          maxPolarAngle={Math.PI}
          minPolarAngle={0}
        />
      </Canvas>
    </div>
  );
}

export default GeometricFlowerOfLife3D;
import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line } from '@react-three/drei';
import * as THREE from 'three';

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

    // For quads (4 vertices), split into two triangles
    if (vertices.length === 4) {
      const positions = [
        ...vertices[0], ...vertices[1], ...vertices[2], // First triangle
        ...vertices[0], ...vertices[2], ...vertices[3]  // Second triangle
      ];
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    } else {
      // For triangles (3 vertices), use as is
      const verts = new Float32Array(vertices.flat());
      geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    }

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

// Main Metatron's Cube component
function MetatronsCubePattern() {
  const group = useRef();

  // Rotate the entire pattern
  useFrame((state) => {
    if (group.current) {
      group.current.rotation.y += 0.003;
      group.current.rotation.x += 0.001;
    }
  });

  // Define the vertices for 3D Metatron's Cube
  const vertices = useMemo(() => {
    const positions = [];
    const size = 2;

    // 8 vertices of the outer cube
    positions.push([-size, -size, -size]); // 0: bottom-left-back
    positions.push([size, -size, -size]);  // 1: bottom-right-back
    positions.push([size, size, -size]);   // 2: top-right-back
    positions.push([-size, size, -size]);  // 3: top-left-back
    positions.push([-size, -size, size]);  // 4: bottom-left-front
    positions.push([size, -size, size]);   // 5: bottom-right-front
    positions.push([size, size, size]);    // 6: top-right-front
    positions.push([-size, size, size]);   // 7: top-left-front

    // 6 vertices at the center of each cube face
    positions.push([0, 0, -size]);    // 8: back face center
    positions.push([0, 0, size]);     // 9: front face center
    positions.push([-size, 0, 0]);    // 10: left face center
    positions.push([size, 0, 0]);     // 11: right face center
    positions.push([0, -size, 0]);    // 12: bottom face center
    positions.push([0, size, 0]);     // 13: top face center

    // Center point
    positions.push([0, 0, 0]);        // 14: center

    return positions;
  }, []);

  // Create all connection lines
  const connections = useMemo(() => {
    const lines = [];

    // Outer cube edges (12 edges)
    // Bottom square
    lines.push({ start: vertices[0], end: vertices[1], key: 'cube-0-1' });
    lines.push({ start: vertices[1], end: vertices[5], key: 'cube-1-5' });
    lines.push({ start: vertices[5], end: vertices[4], key: 'cube-5-4' });
    lines.push({ start: vertices[4], end: vertices[0], key: 'cube-4-0' });

    // Top square
    lines.push({ start: vertices[3], end: vertices[2], key: 'cube-3-2' });
    lines.push({ start: vertices[2], end: vertices[6], key: 'cube-2-6' });
    lines.push({ start: vertices[6], end: vertices[7], key: 'cube-6-7' });
    lines.push({ start: vertices[7], end: vertices[3], key: 'cube-7-3' });

    // Vertical edges
    lines.push({ start: vertices[0], end: vertices[3], key: 'cube-0-3' });
    lines.push({ start: vertices[1], end: vertices[2], key: 'cube-1-2' });
    lines.push({ start: vertices[5], end: vertices[6], key: 'cube-5-6' });
    lines.push({ start: vertices[4], end: vertices[7], key: 'cube-4-7' });

    // Diagonal connections across cube faces
    // Back face diagonals
    lines.push({ start: vertices[0], end: vertices[2], key: 'diag-0-2' });
    lines.push({ start: vertices[1], end: vertices[3], key: 'diag-1-3' });

    // Front face diagonals
    lines.push({ start: vertices[4], end: vertices[6], key: 'diag-4-6' });
    lines.push({ start: vertices[5], end: vertices[7], key: 'diag-5-7' });

    // Left face diagonals
    lines.push({ start: vertices[0], end: vertices[7], key: 'diag-0-7' });
    lines.push({ start: vertices[3], end: vertices[4], key: 'diag-3-4' });

    // Right face diagonals
    lines.push({ start: vertices[1], end: vertices[6], key: 'diag-1-6' });
    lines.push({ start: vertices[2], end: vertices[5], key: 'diag-2-5' });

    // Top face diagonals
    lines.push({ start: vertices[2], end: vertices[7], key: 'diag-2-7' });
    lines.push({ start: vertices[3], end: vertices[6], key: 'diag-3-6' });

    // Bottom face diagonals
    lines.push({ start: vertices[0], end: vertices[5], key: 'diag-0-5' });
    lines.push({ start: vertices[1], end: vertices[4], key: 'diag-1-4' });

    // Connect face centers to their four corner vertices
    // Back face center (8) to corners
    lines.push({ start: vertices[8], end: vertices[0], key: 'face-8-0' });
    lines.push({ start: vertices[8], end: vertices[1], key: 'face-8-1' });
    lines.push({ start: vertices[8], end: vertices[2], key: 'face-8-2' });
    lines.push({ start: vertices[8], end: vertices[3], key: 'face-8-3' });

    // Front face center (9) to corners
    lines.push({ start: vertices[9], end: vertices[4], key: 'face-9-4' });
    lines.push({ start: vertices[9], end: vertices[5], key: 'face-9-5' });
    lines.push({ start: vertices[9], end: vertices[6], key: 'face-9-6' });
    lines.push({ start: vertices[9], end: vertices[7], key: 'face-9-7' });

    // Left face center (10) to corners
    lines.push({ start: vertices[10], end: vertices[0], key: 'face-10-0' });
    lines.push({ start: vertices[10], end: vertices[3], key: 'face-10-3' });
    lines.push({ start: vertices[10], end: vertices[4], key: 'face-10-4' });
    lines.push({ start: vertices[10], end: vertices[7], key: 'face-10-7' });

    // Right face center (11) to corners
    lines.push({ start: vertices[11], end: vertices[1], key: 'face-11-1' });
    lines.push({ start: vertices[11], end: vertices[2], key: 'face-11-2' });
    lines.push({ start: vertices[11], end: vertices[5], key: 'face-11-5' });
    lines.push({ start: vertices[11], end: vertices[6], key: 'face-11-6' });

    // Bottom face center (12) to corners
    lines.push({ start: vertices[12], end: vertices[0], key: 'face-12-0' });
    lines.push({ start: vertices[12], end: vertices[1], key: 'face-12-1' });
    lines.push({ start: vertices[12], end: vertices[4], key: 'face-12-4' });
    lines.push({ start: vertices[12], end: vertices[5], key: 'face-12-5' });

    // Top face center (13) to corners
    lines.push({ start: vertices[13], end: vertices[2], key: 'face-13-2' });
    lines.push({ start: vertices[13], end: vertices[3], key: 'face-13-3' });
    lines.push({ start: vertices[13], end: vertices[6], key: 'face-13-6' });
    lines.push({ start: vertices[13], end: vertices[7], key: 'face-13-7' });

    // Connect center to all face centers (star pattern)
    lines.push({ start: vertices[14], end: vertices[8], key: 'center-8' });
    lines.push({ start: vertices[14], end: vertices[9], key: 'center-9' });
    lines.push({ start: vertices[14], end: vertices[10], key: 'center-10' });
    lines.push({ start: vertices[14], end: vertices[11], key: 'center-11' });
    lines.push({ start: vertices[14], end: vertices[12], key: 'center-12' });
    lines.push({ start: vertices[14], end: vertices[13], key: 'center-13' });

    // Connect center to all cube vertices (8 lines)
    for (let i = 0; i < 8; i++) {
      lines.push({
        start: vertices[14],
        end: vertices[i],
        key: `center-vertex-${i}`,
        opacity: 0.4 // Make these slightly transparent
      });
    }

    // Connect face centers to adjacent face centers (octahedron)
    lines.push({ start: vertices[8], end: vertices[10], key: 'oct-8-10' });
    lines.push({ start: vertices[8], end: vertices[11], key: 'oct-8-11' });
    lines.push({ start: vertices[8], end: vertices[12], key: 'oct-8-12' });
    lines.push({ start: vertices[8], end: vertices[13], key: 'oct-8-13' });

    lines.push({ start: vertices[9], end: vertices[10], key: 'oct-9-10' });
    lines.push({ start: vertices[9], end: vertices[11], key: 'oct-9-11' });
    lines.push({ start: vertices[9], end: vertices[12], key: 'oct-9-12' });
    lines.push({ start: vertices[9], end: vertices[13], key: 'oct-9-13' });

    lines.push({ start: vertices[10], end: vertices[12], key: 'oct-10-12' });
    lines.push({ start: vertices[10], end: vertices[13], key: 'oct-10-13' });
    lines.push({ start: vertices[11], end: vertices[12], key: 'oct-11-12' });
    lines.push({ start: vertices[11], end: vertices[13], key: 'oct-11-13' });

    return lines;
  }, [vertices]);

  // Create filled planes for cube faces and internal geometry
  const filledPlanes = useMemo(() => {
    const planes = [];

    // Cube faces (6 faces)
    // Front face
    planes.push({
      vertices: [vertices[4], vertices[5], vertices[6], vertices[7]],
      key: 'face-front'
    });

    // Back face
    planes.push({
      vertices: [vertices[0], vertices[3], vertices[2], vertices[1]],
      key: 'face-back'
    });

    // Top face
    planes.push({
      vertices: [vertices[3], vertices[7], vertices[6], vertices[2]],
      key: 'face-top'
    });

    // Bottom face
    planes.push({
      vertices: [vertices[0], vertices[1], vertices[5], vertices[4]],
      key: 'face-bottom'
    });

    // Left face
    planes.push({
      vertices: [vertices[0], vertices[4], vertices[7], vertices[3]],
      key: 'face-left'
    });

    // Right face
    planes.push({
      vertices: [vertices[1], vertices[2], vertices[6], vertices[5]],
      key: 'face-right'
    });

    // Internal triangular planes forming tetrahedrons
    // These connect alternating cube vertices to form interpenetrating tetrahedrons

    // First tetrahedron (4 faces)
    planes.push({
      vertices: [vertices[0], vertices[2], vertices[5]],
      key: 'tetra1-face1'
    });
    planes.push({
      vertices: [vertices[0], vertices[5], vertices[7]],
      key: 'tetra1-face2'
    });
    planes.push({
      vertices: [vertices[0], vertices[7], vertices[2]],
      key: 'tetra1-face3'
    });
    planes.push({
      vertices: [vertices[2], vertices[7], vertices[5]],
      key: 'tetra1-face4'
    });

    // Second tetrahedron (4 faces)
    planes.push({
      vertices: [vertices[1], vertices[3], vertices[4]],
      key: 'tetra2-face1'
    });
    planes.push({
      vertices: [vertices[1], vertices[4], vertices[6]],
      key: 'tetra2-face2'
    });
    planes.push({
      vertices: [vertices[1], vertices[6], vertices[3]],
      key: 'tetra2-face3'
    });
    planes.push({
      vertices: [vertices[3], vertices[6], vertices[4]],
      key: 'tetra2-face4'
    });

    // Octahedron faces (connecting face centers)
    // Each face of the octahedron
    planes.push({
      vertices: [vertices[8], vertices[10], vertices[12]],
      key: 'oct-1'
    });

    planes.push({
      vertices: [vertices[8], vertices[12], vertices[11]],
      key: 'oct-2'
    });

    planes.push({
      vertices: [vertices[8], vertices[11], vertices[13]],
      key: 'oct-3'
    });

    planes.push({
      vertices: [vertices[8], vertices[13], vertices[10]],
      key: 'oct-4'
    });

    planes.push({
      vertices: [vertices[9], vertices[10], vertices[13]],
      key: 'oct-5'
    });

    planes.push({
      vertices: [vertices[9], vertices[13], vertices[11]],
      key: 'oct-6'
    });

    planes.push({
      vertices: [vertices[9], vertices[11], vertices[12]],
      key: 'oct-7'
    });

    planes.push({
      vertices: [vertices[9], vertices[12], vertices[10]],
      key: 'oct-8'
    });

    return planes;
  }, [vertices]);

  return (
    <group ref={group}>
      {/* Render filled planes first (behind lines) */}
      {filledPlanes.map((plane) => (
        <FilledPlane
          key={plane.key}
          vertices={plane.vertices}
          color="#000000"
          opacity={0.1}
        />
      ))}

      {/* Render all connection lines */}
      {connections.map((conn) => (
        <ConnectionLine
          key={conn.key}
          start={conn.start}
          end={conn.end}
          opacity={conn.opacity || 0.8}
        />
      ))}
    </group>
  );
}

// Main component that sets up the 3D scene
function MetatronsCube3D() {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas
        camera={{ position: [8, 6, 6], fov: 50 }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.6} />
        <pointLight position={[10, 10, 10]} intensity={0.8} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={0.6} color="#FFFFFF" />

        <MetatronsCubePattern />

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

export default MetatronsCube3D;
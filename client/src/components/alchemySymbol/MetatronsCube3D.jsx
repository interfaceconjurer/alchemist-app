import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line } from '@react-three/drei';
import * as THREE from 'three';

// Create connecting lines between points with animation
function ConnectionLine({ start, end, color = "#000000", opacity = 0.8, animationProgress = 1, delay = 0, emissive = false }) {
  const lineRef = useRef();
  const points = useMemo(() => [
    new THREE.Vector3(...start),
    new THREE.Vector3(...end)
  ], [start, end]);

  // Animate line opacity based on progress
  useFrame((state) => {
    if (lineRef.current) {
      const progress = Math.max(0, Math.min(1, (animationProgress - delay) * 2));
      lineRef.current.material.opacity = opacity * progress;

      // Add pulsing effect for emissive lines
      if (emissive && lineRef.current.material) {
        const pulse = 0.8 + Math.sin(state.clock.elapsedTime * 3 + delay * 10) * 0.2;
        lineRef.current.material.opacity = opacity * progress * pulse;
      }
    }
  });

  return (
    <Line
      ref={lineRef}
      points={points}
      color={color}
      lineWidth={emissive ? 3 : 1}
      opacity={0}
      transparent
    />
  );
}

// Create filled geometric planes with animation
function FilledPlane({ vertices, color = "#000000", opacity = 0.1, emissive = "#000000", emissiveIntensity = 0, animationProgress = 1, delay = 0 }) {
  const meshRef = useRef();
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

  // Animate opacity and scale
  useFrame((state) => {
    if (meshRef.current) {
      const progress = Math.max(0, Math.min(1, (animationProgress - delay) * 2));
      meshRef.current.material.opacity = opacity * progress;

      // Pulsing emissive effect
      if (emissiveIntensity > 0) {
        const pulse = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.2;
        meshRef.current.material.emissiveIntensity = emissiveIntensity * pulse * progress;
      }

      // Scale animation
      const scale = 0.5 + progress * 0.5;
      meshRef.current.scale.setScalar(scale);
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial
        color={color}
        emissive={emissive}
        emissiveIntensity={0}
        transparent
        opacity={0}
        side={THREE.DoubleSide}
        depthWrite={false}
        metalness={0.3}
        roughness={0.4}
      />
    </mesh>
  );
}

// Emanating particle system - particles radiating from the cube
function EmanatingParticles({ animationProgress, isDark }) {
  const particlesRef = useRef([]);
  const groupRef = useRef();

  // Create particle textures - purple and white/black
  const particleTextures = useMemo(() => {
    // Purple texture
    const purpleCanvas = document.createElement('canvas');
    purpleCanvas.width = 64;
    purpleCanvas.height = 64;
    const purpleCtx = purpleCanvas.getContext('2d');
    purpleCtx.clearRect(0, 0, 64, 64);
    purpleCtx.beginPath();
    purpleCtx.arc(32, 32, 28, 0, Math.PI * 2);
    purpleCtx.fillStyle = 'rgba(139, 0, 255, 0.8)'; // Purple with higher opacity
    purpleCtx.fill();
    const purpleTexture = new THREE.CanvasTexture(purpleCanvas);
    purpleTexture.needsUpdate = true;

    // White/Black texture (white in dark mode, black in light mode)
    const centerCanvas = document.createElement('canvas');
    centerCanvas.width = 64;
    centerCanvas.height = 64;
    const centerCtx = centerCanvas.getContext('2d');
    centerCtx.clearRect(0, 0, 64, 64);
    centerCtx.beginPath();
    centerCtx.arc(32, 32, 28, 0, Math.PI * 2);
    centerCtx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.8)';
    centerCtx.fill();
    const centerTexture = new THREE.CanvasTexture(centerCanvas);
    centerTexture.needsUpdate = true;

    return { purple: purpleTexture, center: centerTexture };
  }, [isDark]);

  // Initialize particles
  useEffect(() => {
    const particles = [];
    for (let i = 0; i < 30; i++) {
      // Determine if this particle should be center color or purple
      const isFromCenter = i < 12;
      const texture = isFromCenter ? particleTextures.center : particleTextures.purple;

      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: texture,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          sizeAttenuation: true,
          blending: isDark ? THREE.NormalBlending : THREE.AdditiveBlending
        })
      );

      // Start at random positions on cube vertices
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const radius = 2 + Math.random(); // Cube size is 2
      sprite.position.set(
        Math.cos(theta) * Math.sin(phi) * radius,
        Math.sin(theta) * Math.sin(phi) * radius,
        Math.cos(phi) * radius
      );

      // Random direction for emanation
      const speed = 0.015 + Math.random() * 0.02;

      // Custom properties for animation
      sprite.userData = {
        velocity: new THREE.Vector3(
          Math.sin(phi) * Math.cos(theta) * speed,
          Math.sin(phi) * Math.sin(theta) * speed,
          Math.cos(phi) * speed
        ),
        life: Math.random(),
        maxLife: 2 + Math.random() * 2,
        size: 0.05 + Math.random() * 0.08,
        startPosition: sprite.position.clone(),
        isFromCenter: isFromCenter
      };

      sprite.scale.set(sprite.userData.size, sprite.userData.size, 1);
      particles.push(sprite);

      if (groupRef.current) {
        groupRef.current.add(sprite);
      }
    }
    particlesRef.current = particles;

    return () => {
      particles.forEach(sprite => {
        if (sprite.parent) {
          sprite.parent.remove(sprite);
        }
        sprite.material.dispose();
      });
    };
  }, [particleTextures, isDark]);

  // Animate particles
  useFrame((state, delta) => {
    particlesRef.current.forEach((sprite, index) => {
      // Update life
      sprite.userData.life += delta * 0.5;

      // Calculate lifecycle progress
      const progress = (sprite.userData.life % sprite.userData.maxLife) / sprite.userData.maxLife;

      // Reset when cycle completes
      if (sprite.userData.life >= sprite.userData.maxLife) {
        sprite.userData.life = 0;

        // Pick a position based on particle type
        if (sprite.userData.isFromCenter) {
          // Center particles start from origin
          sprite.userData.startPosition.set(0, 0, 0);
        } else {
          // Purple particles start from cube vertices
          const angle = Math.random() * Math.PI * 2;
          const radius = 1.5 + Math.random() * 0.5;
          sprite.userData.startPosition.set(
            Math.cos(angle) * radius,
            Math.sin(angle) * radius,
            (Math.random() - 0.5) * 2
          );
        }

        // New random direction
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        const speed = 0.015 + Math.random() * 0.02;

        sprite.userData.velocity.set(
          Math.sin(phi) * Math.cos(theta) * speed,
          Math.sin(phi) * Math.sin(theta) * speed,
          Math.cos(phi) * speed
        );
      }

      // Position based on start position plus velocity over time
      const distance = progress * 2;
      sprite.position.copy(sprite.userData.startPosition);
      sprite.position.addScaledVector(sprite.userData.velocity, distance * 100);

      // Opacity fades in and out
      let opacity = 0;
      if (progress < 0.1) {
        opacity = progress * 10;
      } else if (progress < 0.5) {
        opacity = 1;
      } else {
        opacity = (1 - progress) * 2;
      }

      // Center particles are slightly more opaque
      const baseOpacity = sprite.userData.isFromCenter ? 0.7 : 0.5;
      sprite.material.opacity = opacity * baseOpacity * animationProgress;

      // Scale pulses slightly
      const scalePulse = 1 + Math.sin(state.clock.elapsedTime * 3 + index) * 0.1;
      const scale = sprite.userData.size * scalePulse * (1 - progress * 0.3);
      sprite.scale.set(scale, scale, 1);
    });
  });

  return <group ref={groupRef} />;
}

// Main Metatron's Cube component
function MetatronsCubePattern({ wireframeColor, fillOpacity, isDark, emissiveColor, animationProgress }) {
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

    // Outer cube edges (12 edges) - make these thinner/lighter
    // Bottom square
    lines.push({ start: vertices[0], end: vertices[1], key: 'cube-0-1', opacity: 0.3 });
    lines.push({ start: vertices[1], end: vertices[5], key: 'cube-1-5', opacity: 0.3 });
    lines.push({ start: vertices[5], end: vertices[4], key: 'cube-5-4', opacity: 0.3 });
    lines.push({ start: vertices[4], end: vertices[0], key: 'cube-4-0', opacity: 0.3 });

    // Top square
    lines.push({ start: vertices[3], end: vertices[2], key: 'cube-3-2', opacity: 0.3 });
    lines.push({ start: vertices[2], end: vertices[6], key: 'cube-2-6', opacity: 0.3 });
    lines.push({ start: vertices[6], end: vertices[7], key: 'cube-6-7', opacity: 0.3 });
    lines.push({ start: vertices[7], end: vertices[3], key: 'cube-7-3', opacity: 0.3 });

    // Vertical edges
    lines.push({ start: vertices[0], end: vertices[3], key: 'cube-0-3', opacity: 0.3 });
    lines.push({ start: vertices[1], end: vertices[2], key: 'cube-1-2', opacity: 0.3 });
    lines.push({ start: vertices[5], end: vertices[6], key: 'cube-5-6', opacity: 0.3 });
    lines.push({ start: vertices[4], end: vertices[7], key: 'cube-4-7', opacity: 0.3 });

    // STAR TETRAHEDRON EDGES (Merkaba) - these form the two interpenetrating tetrahedrons
    // First tetrahedron edges (vertices 0, 2, 5, 7) - PROMINENT
    lines.push({ start: vertices[0], end: vertices[2], key: 'tetra1-0-2', opacity: 1.0, isTetrahedron: true });
    lines.push({ start: vertices[0], end: vertices[5], key: 'tetra1-0-5', opacity: 1.0, isTetrahedron: true });
    lines.push({ start: vertices[0], end: vertices[7], key: 'tetra1-0-7', opacity: 1.0, isTetrahedron: true });
    lines.push({ start: vertices[2], end: vertices[5], key: 'tetra1-2-5', opacity: 1.0, isTetrahedron: true });
    lines.push({ start: vertices[2], end: vertices[7], key: 'tetra1-2-7', opacity: 1.0, isTetrahedron: true });
    lines.push({ start: vertices[5], end: vertices[7], key: 'tetra1-5-7', opacity: 1.0, isTetrahedron: true });

    // Second tetrahedron edges (vertices 1, 3, 4, 6) - PROMINENT
    lines.push({ start: vertices[1], end: vertices[3], key: 'tetra2-1-3', opacity: 1.0, isTetrahedron: true });
    lines.push({ start: vertices[1], end: vertices[4], key: 'tetra2-1-4', opacity: 1.0, isTetrahedron: true });
    lines.push({ start: vertices[1], end: vertices[6], key: 'tetra2-1-6', opacity: 1.0, isTetrahedron: true });
    lines.push({ start: vertices[3], end: vertices[4], key: 'tetra2-3-4', opacity: 1.0, isTetrahedron: true });
    lines.push({ start: vertices[3], end: vertices[6], key: 'tetra2-3-6', opacity: 1.0, isTetrahedron: true });
    lines.push({ start: vertices[4], end: vertices[6], key: 'tetra2-4-6', opacity: 1.0, isTetrahedron: true });

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

  // Calculate animation delays based on distance from center
  const getDelay = (vertices) => {
    const center = vertices.reduce((acc, v) => {
      return [acc[0] + v[0], acc[1] + v[1], acc[2] + v[2]];
    }, [0, 0, 0]);
    const avgPos = center.map(c => c / vertices.length);
    const distance = Math.sqrt(avgPos[0] ** 2 + avgPos[1] ** 2 + avgPos[2] ** 2);
    return Math.min(0.5, distance * 0.1);
  };

  return (
    <group ref={group}>
      {/* Render cube face planes (subtle background) */}
      {filledPlanes.filter(p => p.key.startsWith('face-')).map((plane) => (
        <FilledPlane
          key={plane.key}
          vertices={plane.vertices}
          color={wireframeColor}
          opacity={fillOpacity.base * 0.5}
          emissive={isDark ? emissiveColor : '#000000'}
          emissiveIntensity={isDark ? 0.05 : 0}
          animationProgress={animationProgress}
          delay={getDelay(plane.vertices)}
        />
      ))}

      {/* Render octahedron planes (medium presence) */}
      {filledPlanes.filter(p => p.key.startsWith('oct-')).map((plane) => (
        <FilledPlane
          key={plane.key}
          vertices={plane.vertices}
          color={wireframeColor}
          opacity={fillOpacity.base * 0.8}
          emissive={isDark ? emissiveColor : '#000000'}
          emissiveIntensity={isDark ? 0.1 : 0.05}
          animationProgress={animationProgress}
          delay={getDelay(plane.vertices)}
        />
      ))}

      {/* Render tetrahedron planes (PROMINENT - star tetrahedron faces) */}
      {filledPlanes.filter(p => p.key.startsWith('tetra')).map((plane) => (
        <FilledPlane
          key={plane.key}
          vertices={plane.vertices}
          color={wireframeColor}
          opacity={fillOpacity.base * 2.5}
          emissive={isDark ? emissiveColor : '#8b00ff'}
          emissiveIntensity={isDark ? 0.5 : 0.2}
          animationProgress={animationProgress}
          delay={getDelay(plane.vertices) * 0.5}
        />
      ))}

      {/* Render non-tetrahedron connection lines (subtle) */}
      {connections.filter(c => !c.isTetrahedron).map((conn, index) => (
        <ConnectionLine
          key={conn.key}
          start={conn.start}
          end={conn.end}
          color={wireframeColor}
          opacity={conn.opacity || (isDark ? 0.5 : 0.4)}
          animationProgress={animationProgress}
          delay={index * 0.005}
          emissive={false}
        />
      ))}

      {/* Render tetrahedron edges LAST (on top, PROMINENT) */}
      {connections.filter(c => c.isTetrahedron).map((conn, index) => (
        <ConnectionLine
          key={conn.key}
          start={conn.start}
          end={conn.end}
          color={wireframeColor}
          opacity={isDark ? 1.0 : 0.95}
          animationProgress={animationProgress}
          delay={index * 0.003}
          emissive={true}
        />
      ))}
    </group>
  );
}

// Animated scene component that manages animation state
function AnimatedScene({ themeColors }) {
  const [animationProgress, setAnimationProgress] = useState(0);

  // Update animation progress
  useFrame((state) => {
    // Simple animation loop with clean timing
    const time = state.clock.elapsedTime;
    const cycleDuration = 6; // Total cycle duration
    const cycleTime = time % cycleDuration;

    let progress;
    if (cycleTime < 2) {
      // Build in (0 to 2 seconds)
      const t = cycleTime / 2;
      // Smooth ease-in-out
      progress = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    } else if (cycleTime < 3) {
      // Hold at full (2 to 3 seconds)
      progress = 1;
    } else if (cycleTime < 5) {
      // Build out (3 to 5 seconds)
      const t = (cycleTime - 3) / 2;
      // Smooth ease-in-out
      progress = 1 - (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
    } else {
      // Pause (5 to 6 seconds)
      progress = 0;
    }

    setAnimationProgress(progress);
  });

  return (
    <>
      <MetatronsCubePattern
        wireframeColor={themeColors.wireframeColor}
        fillOpacity={themeColors.fillOpacity}
        isDark={themeColors.isDark}
        emissiveColor={themeColors.emissiveColor}
        animationProgress={animationProgress}
      />

      {/* Atmospheric effects - particles emanating from the cube */}
      <EmanatingParticles animationProgress={animationProgress} isDark={themeColors.isDark} />
    </>
  );
}

// Main component that sets up the 3D scene
function MetatronsCube3D() {
  const [themeColors, setThemeColors] = useState({
    wireframeColor: '#000000',
    fillOpacity: { base: 0.05, seed: 0.08 },
    emissiveColor: '#000000',
    isDark: false
  });

  // Detect theme changes and update colors
  useEffect(() => {
    const updateColors = () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      const styles = getComputedStyle(document.documentElement);
      const wireframeColor = styles.getPropertyValue('--wireframe-color').trim() || '#000000';
      const fillOpacityBase = parseFloat(styles.getPropertyValue('--fill-opacity-base')) || 0.05;
      const fillOpacitySeed = parseFloat(styles.getPropertyValue('--fill-opacity-seed')) || 0.08;
      const emissiveColor = styles.getPropertyValue('--wireframe-emissive')?.trim() || '#ff8800';

      setThemeColors({
        wireframeColor,
        fillOpacity: { base: fillOpacityBase, seed: fillOpacitySeed },
        emissiveColor,
        isDark
      });
    };

    // Initial update
    updateColors();

    // Watch for theme changes
    const observer = new MutationObserver(updateColors);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas
        camera={{ position: [0, 0, 8], fov: 60 }}
        style={{ background: 'transparent' }}
      >
        {/* Adjusted lighting for purple glow effect */}
        <ambientLight intensity={themeColors.isDark ? 0.2 : 0.5} />

        {/* Fog for atmospheric effect */}
        {themeColors.isDark && <fog attach="fog" args={['#0a0a0a', 5, 30]} />}

        {themeColors.isDark ? (
          <>
            {/* White center light and purple accent lights for glow effect in dark mode */}
            <pointLight position={[0, 0, 0]} intensity={0.6} color="#ffffff" />
            <pointLight position={[5, 5, 5]} intensity={0.3} color="#b366ff" />
            <pointLight position={[-5, -5, -5]} intensity={0.3} color="#b366ff" />
          </>
        ) : (
          <>
            {/* Purple accent lighting for light mode */}
            <pointLight position={[0, 0, 0]} intensity={0.4} color="#8b00ff" />
            <pointLight position={[10, 10, 10]} intensity={0.6} color="#ffffff" />
            <pointLight position={[-10, -10, -10]} intensity={0.4} color="#b366ff" />
            <directionalLight position={[5, 5, 5]} intensity={0.5} color="#FFFFFF" />
          </>
        )}

        <AnimatedScene themeColors={themeColors} />

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate={false}
          maxPolarAngle={Math.PI}
          minPolarAngle={0}
        />
      </Canvas>
    </div>
  );
}

export default MetatronsCube3D;
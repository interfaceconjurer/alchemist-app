import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line } from '@react-three/drei';
import * as THREE from 'three';

function TetraEdge({ start, end, color }) {
  const points = useMemo(() => [
    new THREE.Vector3(...start),
    new THREE.Vector3(...end)
  ], [start, end]);

  return (
    <Line
      points={points}
      color={color}
      lineWidth={2}
      opacity={0.9}
      transparent
    />
  );
}

function TetraFace({ vertices, color }) {
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
        opacity={0}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

// Bubbles that float upward off the surface of the tetrahedron
function FloatingBubbles({ shapeColor, vertices }) {
  const particlesRef = useRef([]);
  const groupRef = useRef();

  const bubbleTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 64, 64);
    ctx.beginPath();
    ctx.arc(32, 32, 24, 0, Math.PI * 2);
    ctx.fillStyle = shapeColor === '#ffffff' ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)';
    ctx.fill();
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, [shapeColor]);

  // Pick a random point on the upper faces of the tetrahedron (faces that include the apex)
  const randomSurfacePoint = (verts) => {
    // Only the 3 faces that include vertex 0 (the apex)
    const faceIndices = [[0,1,2],[0,1,3],[0,2,3]];
    const face = faceIndices[Math.floor(Math.random() * faceIndices.length)];
    const a = new THREE.Vector3(...verts[face[0]]);
    const b = new THREE.Vector3(...verts[face[1]]);
    const c = new THREE.Vector3(...verts[face[2]]);
    // Random barycentric coordinates
    let u = Math.random();
    let v = Math.random();
    if (u + v > 1) { u = 1 - u; v = 1 - v; }
    const point = a.clone().multiplyScalar(1 - u - v)
      .add(b.clone().multiplyScalar(u))
      .add(c.clone().multiplyScalar(v));
    return point;
  };

  useEffect(() => {
    const particles = [];
    for (let i = 0; i < 15; i++) {
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: bubbleTexture,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          sizeAttenuation: true,
        })
      );

      const startPos = randomSurfacePoint(vertices);
      sprite.position.copy(startPos);

      // --- BUBBLE SIZE: ~0.15 = ~20px at camera distance 7. Tweak these two numbers. ---
      const size = 0.12 + Math.random() * 0.08;
      sprite.scale.set(size, size, 1);

      sprite.userData = {
        life: Math.random() * 4, // stagger
        maxLife: 3 + Math.random() * 2,
        size,
        drift: (Math.random() - 0.5) * 0.003, // gentle horizontal wobble
        startPos: startPos.clone(),
      };

      particles.push(sprite);
      if (groupRef.current) groupRef.current.add(sprite);
    }
    particlesRef.current = particles;

    return () => {
      particles.forEach(sprite => {
        if (sprite.parent) sprite.parent.remove(sprite);
        sprite.material.dispose();
      });
    };
  }, [bubbleTexture, vertices]);

  useFrame((state, delta) => {
    particlesRef.current.forEach((sprite) => {
      sprite.userData.life += delta;
      const { life, maxLife, size, drift } = sprite.userData;
      const progress = (life % maxLife) / maxLife;

      // Reset to a new surface point when cycle ends
      if (life >= maxLife) {
        sprite.userData.life = 0;
        const newStart = randomSurfacePoint(vertices);
        sprite.position.copy(newStart);
        sprite.userData.startPos.copy(newStart);
        sprite.userData.drift = (Math.random() - 0.5) * 0.003;
        // --- BUBBLE SIZE on reset: same range as above ---
        sprite.userData.size = 0.12 + Math.random() * 0.08;
        return;
      }

      // Float upward from start position
      const riseHeight = progress * 3.5;
      sprite.position.y = sprite.userData.startPos.y + riseHeight;

      // Gentle side-to-side wobble
      sprite.position.x = sprite.userData.startPos.x + Math.sin(life * 2) * 0.15;
      sprite.position.z = sprite.userData.startPos.z + Math.cos(life * 1.5) * 0.1;

      // Fade in, hold, fade out
      let opacity;
      if (progress < 0.1) {
        opacity = progress * 10;
      } else if (progress < 0.6) {
        opacity = 1;
      } else {
        opacity = (1 - progress) * 2.5;
      }
      sprite.material.opacity = Math.max(0, opacity * 0.4);

      // Slight size variation as they rise
      const s = sprite.userData.size * (1 + progress * 0.3);
      sprite.scale.set(s, s, 1);
    });
  });

  return <group ref={groupRef} />;
}

function TetrahedronShape({ shapeColor }) {
  const group = useRef();

  useFrame(() => {
    if (group.current) {
      group.current.rotation.y += 0.01;
    }
  });

  // Regular tetrahedron vertices, apex pointing up
  const vertices = useMemo(() => {
    const s = 2.2;
    return [
      [0, s, 0],
      [s * Math.sqrt(8 / 9), -s / 3, 0],
      [-s * Math.sqrt(2 / 9), -s / 3, s * Math.sqrt(2 / 3)],
      [-s * Math.sqrt(2 / 9), -s / 3, -s * Math.sqrt(2 / 3)]
    ];
  }, []);

  const edges = useMemo(() => [
    { start: vertices[0], end: vertices[1], key: 'e01' },
    { start: vertices[0], end: vertices[2], key: 'e02' },
    { start: vertices[0], end: vertices[3], key: 'e03' },
    { start: vertices[1], end: vertices[2], key: 'e12' },
    { start: vertices[1], end: vertices[3], key: 'e13' },
    { start: vertices[2], end: vertices[3], key: 'e23' },
  ], [vertices]);

  const faces = useMemo(() => [
    { vertices: [vertices[0], vertices[1], vertices[2]], key: 'f012' },
    { vertices: [vertices[0], vertices[1], vertices[3]], key: 'f013' },
    { vertices: [vertices[0], vertices[2], vertices[3]], key: 'f023' },
    { vertices: [vertices[1], vertices[2], vertices[3]], key: 'f123' },
  ], [vertices]);

  return (
    <group ref={group} position={[0, -1.5, 0]}>
      {faces.map((face) => (
        <TetraFace
          key={face.key}
          vertices={face.vertices}
          color={shapeColor}
        />
      ))}

      {edges.map((edge) => (
        <TetraEdge
          key={edge.key}
          start={edge.start}
          end={edge.end}
          color={shapeColor}
        />
      ))}

      {vertices.map((v, i) => (
        <mesh key={`v${i}`} position={v}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshStandardMaterial color={shapeColor} />
        </mesh>
      ))}

      <FloatingBubbles shapeColor={shapeColor} vertices={vertices} />
    </group>
  );
}

function Tetrahedron3D() {
  const [shapeColor, setShapeColor] = useState('#000000');

  useEffect(() => {
    const updateTheme = () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      setShapeColor(isDark ? '#ffffff' : '#000000');
    };

    updateTheme();

    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas
        camera={{ position: [0, -1.5, 7], fov: 60 }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.5} color="#ffffff" />
        <directionalLight position={[5, 5, 5]} intensity={0.5} color="#ffffff" />

        <TetrahedronShape shapeColor={shapeColor} />

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate={false}
        />
      </Canvas>
    </div>
  );
}

export default Tetrahedron3D;

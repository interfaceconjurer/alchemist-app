import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line } from '@react-three/drei';
import * as THREE from 'three';

function OctaEdge({ start, end, color }) {
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

function OctaFace({ vertices, color }) {
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

// Bubbles that float upward off the top half of the octahedron
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

  // Pick a random point on the upper 4 faces (those that include vertex 0, the top apex)
  const randomTopPoint = (verts) => {
    const topFaces = [[0,1,2],[0,2,3],[0,3,4],[0,4,1]];
    const face = topFaces[Math.floor(Math.random() * topFaces.length)];
    const a = new THREE.Vector3(...verts[face[0]]);
    const b = new THREE.Vector3(...verts[face[1]]);
    const c = new THREE.Vector3(...verts[face[2]]);
    let u = Math.random();
    let v = Math.random();
    if (u + v > 1) { u = 1 - u; v = 1 - v; }
    return a.clone().multiplyScalar(1 - u - v)
      .add(b.clone().multiplyScalar(u))
      .add(c.clone().multiplyScalar(v));
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

      const startPos = randomTopPoint(vertices);
      sprite.position.copy(startPos);

      const size = 0.12 + Math.random() * 0.08;
      sprite.scale.set(size, size, 1);

      sprite.userData = {
        life: Math.random() * 4,
        maxLife: 3 + Math.random() * 2,
        size,
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
      const { life, maxLife } = sprite.userData;
      const progress = (life % maxLife) / maxLife;

      if (life >= maxLife) {
        sprite.userData.life = 0;
        const newStart = randomTopPoint(vertices);
        sprite.position.copy(newStart);
        sprite.userData.startPos.copy(newStart);
        sprite.userData.size = 0.12 + Math.random() * 0.08;
        return;
      }

      const riseHeight = progress * 3.5;
      sprite.position.y = sprite.userData.startPos.y + riseHeight;

      sprite.position.x = sprite.userData.startPos.x + Math.sin(life * 2) * 0.15;
      sprite.position.z = sprite.userData.startPos.z + Math.cos(life * 1.5) * 0.1;

      let opacity;
      if (progress < 0.1) {
        opacity = progress * 10;
      } else if (progress < 0.6) {
        opacity = 1;
      } else {
        opacity = (1 - progress) * 2.5;
      }
      sprite.material.opacity = Math.max(0, opacity * 0.4);

      const s = sprite.userData.size * (1 + progress * 0.3);
      sprite.scale.set(s, s, 1);
    });
  });

  return <group ref={groupRef} />;
}

function OctahedronShape({ shapeColor }) {
  const group = useRef();

  // Tilt to show the hexagonal face-on profile, then slowly spin
  // const tiltX = Math.atan(1 / Math.sqrt(2)); // ~35.26° to align a face toward camera
  // const tiltY = Math.PI / 4; // 45° around Y
  // Stand straight up (top vertex at +Y); set tiltX/tiltY to non-zero to tilt for face-on view
  const tiltX = 0;
  const tiltY = 0;

  useFrame(() => {
    if (group.current) {
      group.current.rotation.y += 0.01;
    }
  });

  // Regular octahedron: 6 vertices — top, bottom, and 4 equatorial
  const vertices = useMemo(() => {
    const s = 2;
    return [
      [0,  s, 0],  // 0: top
      [ s, 0, 0],  // 1: right
      [0,  0, s],  // 2: front
      [-s, 0, 0],  // 3: left
      [0,  0, -s], // 4: back
      [0, -s, 0],  // 5: bottom
    ];
  }, []);

  // 12 edges
  const edges = useMemo(() => [
    // Top apex to equator
    { start: vertices[0], end: vertices[1], key: 'e01' },
    { start: vertices[0], end: vertices[2], key: 'e02' },
    { start: vertices[0], end: vertices[3], key: 'e03' },
    { start: vertices[0], end: vertices[4], key: 'e04' },
    // Equator ring
    { start: vertices[1], end: vertices[2], key: 'e12' },
    { start: vertices[2], end: vertices[3], key: 'e23' },
    { start: vertices[3], end: vertices[4], key: 'e34' },
    { start: vertices[4], end: vertices[1], key: 'e41' },
    // Bottom apex to equator
    { start: vertices[5], end: vertices[1], key: 'e51' },
    { start: vertices[5], end: vertices[2], key: 'e52' },
    { start: vertices[5], end: vertices[3], key: 'e53' },
    { start: vertices[5], end: vertices[4], key: 'e54' },
  ], [vertices]);

  // 8 triangular faces
  const faces = useMemo(() => [
    // Upper 4 faces
    { vertices: [vertices[0], vertices[1], vertices[2]], key: 'f012' },
    { vertices: [vertices[0], vertices[2], vertices[3]], key: 'f023' },
    { vertices: [vertices[0], vertices[3], vertices[4]], key: 'f034' },
    { vertices: [vertices[0], vertices[4], vertices[1]], key: 'f041' },
    // Lower 4 faces
    { vertices: [vertices[5], vertices[2], vertices[1]], key: 'f521' },
    { vertices: [vertices[5], vertices[3], vertices[2]], key: 'f532' },
    { vertices: [vertices[5], vertices[4], vertices[3]], key: 'f543' },
    { vertices: [vertices[5], vertices[1], vertices[4]], key: 'f514' },
  ], [vertices]);

  return (
    <group ref={group} position={[0, -1.5, 0]}>
      <group rotation={[tiltX, tiltY, 0]}>
        {faces.map((face) => (
          <OctaFace
            key={face.key}
            vertices={face.vertices}
            color={shapeColor}
          />
        ))}

        {edges.map((edge) => (
          <OctaEdge
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
    </group>
  );
}

function Octahedron3D() {
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
        camera={{ position: [0, -1.5, 7], fov: 70 }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.5} color="#ffffff" />
        <directionalLight position={[5, 5, 5]} intensity={0.5} color="#ffffff" />

        <OctahedronShape shapeColor={shapeColor} />

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate={false}
        />
      </Canvas>
    </div>
  );
}

export default Octahedron3D;

import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line } from '@react-three/drei';
import * as THREE from 'three';

function DodecaEdge({ start, end, color }) {
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

// Pentagonal face — triangulated as a fan from first vertex
function DodecaFace({ vertices, color }) {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    // Fan triangulation: 5 vertices -> 3 triangles
    const positions = [
      ...vertices[0], ...vertices[1], ...vertices[2],
      ...vertices[0], ...vertices[2], ...vertices[3],
      ...vertices[0], ...vertices[3], ...vertices[4],
    ];
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
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

// Bubbles that float upward off the top faces
function FloatingBubbles({ shapeColor, topFaceIndices, vertices, faces }) {
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

  const randomTopPoint = () => {
    const faceIdx = topFaceIndices[Math.floor(Math.random() * topFaceIndices.length)];
    const faceVerts = faces[faceIdx].vertices;
    // Pick random triangle within the pentagon fan
    const triIdx = Math.floor(Math.random() * 3);
    const a = new THREE.Vector3(...faceVerts[0]);
    const b = new THREE.Vector3(...faceVerts[triIdx + 1]);
    const c = new THREE.Vector3(...faceVerts[triIdx + 2]);
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

      const startPos = randomTopPoint();
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
  }, [bubbleTexture]);

  useFrame((state, delta) => {
    particlesRef.current.forEach((sprite) => {
      sprite.userData.life += delta;
      const { life, maxLife } = sprite.userData;
      const progress = (life % maxLife) / maxLife;

      if (life >= maxLife) {
        sprite.userData.life = 0;
        const newStart = randomTopPoint();
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

function DodecahedronShape({ shapeColor }) {
  const spinRef = useRef();

  // Tilt to show face-on decagonal profile
  const tiltX = 0;
  // const tiltX = -Math.atan((1 + Math.sqrt(5)) / 2); // tilt so a top face points toward camera

  // --- SPIN: rotates on Y after the tilt, so the top stays on top ---
  // Change 0.003 to adjust speed. Negative = spin the other way.
  useFrame(() => {
    if (spinRef.current) {
      spinRef.current.rotation.y += 0.01;
    }
  });

  const phi = (1 + Math.sqrt(5)) / 2; // golden ratio ~1.618
  const invPhi = 1 / phi;              // ~0.618

  // 20 vertices of a regular dodecahedron
  const vertices = useMemo(() => {
    const s = 1.2; // scale to fit container
    return [
      [ s,  s,  s],           // 0
      [ s,  s, -s],           // 1
      [ s, -s,  s],           // 2
      [ s, -s, -s],           // 3
      [-s,  s,  s],           // 4
      [-s,  s, -s],           // 5
      [-s, -s,  s],           // 6
      [-s, -s, -s],           // 7
      [0,  s * invPhi,  s * phi],  // 8
      [0, -s * invPhi,  s * phi],  // 9
      [0,  s * invPhi, -s * phi],  // 10
      [0, -s * invPhi, -s * phi],  // 11
      [ s * invPhi,  s * phi, 0],  // 12
      [-s * invPhi,  s * phi, 0],  // 13
      [ s * invPhi, -s * phi, 0],  // 14
      [-s * invPhi, -s * phi, 0],  // 15
      [ s * phi, 0,  s * invPhi],  // 16
      [-s * phi, 0,  s * invPhi],  // 17
      [ s * phi, 0, -s * invPhi],  // 18
      [-s * phi, 0, -s * invPhi],  // 19
    ];
  }, []);

  // 30 edges
  const edges = useMemo(() => [
    { start: vertices[0], end: vertices[8], key: 'e0-8' },
    { start: vertices[0], end: vertices[12], key: 'e0-12' },
    { start: vertices[0], end: vertices[16], key: 'e0-16' },
    { start: vertices[1], end: vertices[10], key: 'e1-10' },
    { start: vertices[1], end: vertices[12], key: 'e1-12' },
    { start: vertices[1], end: vertices[18], key: 'e1-18' },
    { start: vertices[2], end: vertices[9], key: 'e2-9' },
    { start: vertices[2], end: vertices[14], key: 'e2-14' },
    { start: vertices[2], end: vertices[16], key: 'e2-16' },
    { start: vertices[3], end: vertices[11], key: 'e3-11' },
    { start: vertices[3], end: vertices[14], key: 'e3-14' },
    { start: vertices[3], end: vertices[18], key: 'e3-18' },
    { start: vertices[4], end: vertices[8], key: 'e4-8' },
    { start: vertices[4], end: vertices[13], key: 'e4-13' },
    { start: vertices[4], end: vertices[17], key: 'e4-17' },
    { start: vertices[5], end: vertices[10], key: 'e5-10' },
    { start: vertices[5], end: vertices[13], key: 'e5-13' },
    { start: vertices[5], end: vertices[19], key: 'e5-19' },
    { start: vertices[6], end: vertices[9], key: 'e6-9' },
    { start: vertices[6], end: vertices[15], key: 'e6-15' },
    { start: vertices[6], end: vertices[17], key: 'e6-17' },
    { start: vertices[7], end: vertices[11], key: 'e7-11' },
    { start: vertices[7], end: vertices[15], key: 'e7-15' },
    { start: vertices[7], end: vertices[19], key: 'e7-19' },
    { start: vertices[8], end: vertices[9], key: 'e8-9' },
    { start: vertices[10], end: vertices[11], key: 'e10-11' },
    { start: vertices[12], end: vertices[13], key: 'e12-13' },
    { start: vertices[14], end: vertices[15], key: 'e14-15' },
    { start: vertices[16], end: vertices[18], key: 'e16-18' },
    { start: vertices[17], end: vertices[19], key: 'e17-19' },
  ], [vertices]);

  // 12 pentagonal faces (vertex indices in winding order)
  const faces = useMemo(() => [
    { vertices: [vertices[0], vertices[16], vertices[2], vertices[9], vertices[8]], key: 'f0' },
    { vertices: [vertices[0], vertices[8], vertices[4], vertices[13], vertices[12]], key: 'f1' },
    { vertices: [vertices[0], vertices[12], vertices[1], vertices[18], vertices[16]], key: 'f2' },
    { vertices: [vertices[8], vertices[9], vertices[6], vertices[17], vertices[4]], key: 'f3' },
    { vertices: [vertices[2], vertices[16], vertices[18], vertices[3], vertices[14]], key: 'f4' },
    { vertices: [vertices[1], vertices[12], vertices[13], vertices[5], vertices[10]], key: 'f5' },
    { vertices: [vertices[4], vertices[17], vertices[19], vertices[5], vertices[13]], key: 'f6' },
    { vertices: [vertices[2], vertices[14], vertices[15], vertices[6], vertices[9]], key: 'f7' },
    { vertices: [vertices[1], vertices[10], vertices[11], vertices[3], vertices[18]], key: 'f8' },
    { vertices: [vertices[6], vertices[15], vertices[7], vertices[19], vertices[17]], key: 'f9' },
    { vertices: [vertices[3], vertices[11], vertices[7], vertices[15], vertices[14]], key: 'f10' },
    { vertices: [vertices[5], vertices[19], vertices[7], vertices[11], vertices[10]], key: 'f11' },
  ], [vertices]);

  // Top faces for bubble spawning (faces with highest avg Y): faces 1 and 5
  const topFaceIndices = [1, 5];

  return (
    <group position={[0, -1.5, 0]}>
      <group rotation={[tiltX, 0, 0]}>
        <group ref={spinRef}>
        {faces.map((face) => (
          <DodecaFace
            key={face.key}
            vertices={face.vertices}
            color={shapeColor}
          />
        ))}

        {edges.map((edge) => (
          <DodecaEdge
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

        <FloatingBubbles
          shapeColor={shapeColor}
          topFaceIndices={topFaceIndices}
          vertices={vertices}
          faces={faces}
        />
        </group>
      </group>
    </group>
  );
}

function Dodecahedron3D() {
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
        camera={{ position: [0, 4, 7], fov: 60 }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.5} color="#ffffff" />
        <directionalLight position={[5, 5, 5]} intensity={0.5} color="#ffffff" />

        <DodecahedronShape shapeColor={shapeColor} />

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate={false}
        />
      </Canvas>
    </div>
  );
}

export default Dodecahedron3D;

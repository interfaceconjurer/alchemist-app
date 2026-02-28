import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line } from '@react-three/drei';
import * as THREE from 'three';

function IcoEdge({ start, end, color }) {
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

function IcoFace({ vertices, color }) {
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

function FloatingBubbles({ shapeColor, vertices, faces, topFaceIndices }) {
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
    const a = new THREE.Vector3(...faceVerts[0]);
    const b = new THREE.Vector3(...faceVerts[1]);
    const c = new THREE.Vector3(...faceVerts[2]);
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

function IcosahedronShape({ shapeColor }) {
  const spinRef = useRef();

  // Tilt so a face points toward camera (face-on view)
  const tiltX = 0;
  const tiltY = 0;
  // const tiltX = -Math.atan(1 / (2 * (1 + Math.sqrt(5)) / 2)); // ~-17.2°

  useFrame(() => {
    if (spinRef.current) {
      spinRef.current.rotation.y += 0.01;
    }
  });

  const phi = (1 + Math.sqrt(5)) / 2; // golden ratio ~1.618

  // 12 vertices of a regular icosahedron
  const vertices = useMemo(() => {
    const s = 1.4;
    return [
      [0,  s,  s * phi],  // 0
      [0,  s, -s * phi],  // 1
      [0, -s,  s * phi],  // 2
      [0, -s, -s * phi],  // 3
      [ s * phi, 0,  s],  // 4
      [ s * phi, 0, -s],  // 5
      [-s * phi, 0,  s],  // 6
      [-s * phi, 0, -s],  // 7
      [ s,  s * phi, 0],  // 8
      [-s,  s * phi, 0],  // 9
      [ s, -s * phi, 0],  // 10
      [-s, -s * phi, 0],  // 11
    ];
  }, []);

  // 30 edges
  const edges = useMemo(() => [
    // Top vertex connections
    { start: vertices[0], end: vertices[2], key: 'e0-2' },
    { start: vertices[0], end: vertices[4], key: 'e0-4' },
    { start: vertices[0], end: vertices[6], key: 'e0-6' },
    { start: vertices[0], end: vertices[8], key: 'e0-8' },
    { start: vertices[0], end: vertices[9], key: 'e0-9' },
    { start: vertices[1], end: vertices[3], key: 'e1-3' },
    { start: vertices[1], end: vertices[5], key: 'e1-5' },
    { start: vertices[1], end: vertices[7], key: 'e1-7' },
    { start: vertices[1], end: vertices[8], key: 'e1-8' },
    { start: vertices[1], end: vertices[9], key: 'e1-9' },
    { start: vertices[2], end: vertices[4], key: 'e2-4' },
    { start: vertices[2], end: vertices[6], key: 'e2-6' },
    { start: vertices[2], end: vertices[10], key: 'e2-10' },
    { start: vertices[2], end: vertices[11], key: 'e2-11' },
    { start: vertices[3], end: vertices[5], key: 'e3-5' },
    { start: vertices[3], end: vertices[7], key: 'e3-7' },
    { start: vertices[3], end: vertices[10], key: 'e3-10' },
    { start: vertices[3], end: vertices[11], key: 'e3-11' },
    { start: vertices[4], end: vertices[5], key: 'e4-5' },
    { start: vertices[4], end: vertices[8], key: 'e4-8' },
    { start: vertices[4], end: vertices[10], key: 'e4-10' },
    { start: vertices[5], end: vertices[8], key: 'e5-8' },
    { start: vertices[5], end: vertices[10], key: 'e5-10' },
    { start: vertices[6], end: vertices[7], key: 'e6-7' },
    { start: vertices[6], end: vertices[9], key: 'e6-9' },
    { start: vertices[6], end: vertices[11], key: 'e6-11' },
    { start: vertices[7], end: vertices[9], key: 'e7-9' },
    { start: vertices[7], end: vertices[11], key: 'e7-11' },
    { start: vertices[8], end: vertices[9], key: 'e8-9' },
    { start: vertices[10], end: vertices[11], key: 'e10-11' },
  ], [vertices]);

  // 20 triangular faces
  const faces = useMemo(() => [
    // 5 faces around vertex 0 (top region)
    { vertices: [vertices[0], vertices[2], vertices[4]], key: 'f0' },
    { vertices: [vertices[0], vertices[4], vertices[8]], key: 'f1' },
    { vertices: [vertices[0], vertices[8], vertices[9]], key: 'f2' },
    { vertices: [vertices[0], vertices[9], vertices[6]], key: 'f3' },
    { vertices: [vertices[0], vertices[6], vertices[2]], key: 'f4' },
    // 5 adjacent faces (upper-middle band)
    { vertices: [vertices[2], vertices[4], vertices[10]], key: 'f5' },
    { vertices: [vertices[4], vertices[8], vertices[5]], key: 'f6' },
    { vertices: [vertices[8], vertices[9], vertices[1]], key: 'f7' },
    { vertices: [vertices[9], vertices[6], vertices[7]], key: 'f8' },
    { vertices: [vertices[6], vertices[2], vertices[11]], key: 'f9' },
    // 5 adjacent faces (lower-middle band)
    { vertices: [vertices[10], vertices[4], vertices[5]], key: 'f10' },
    { vertices: [vertices[5], vertices[8], vertices[1]], key: 'f11' },
    { vertices: [vertices[1], vertices[9], vertices[7]], key: 'f12' },
    { vertices: [vertices[7], vertices[6], vertices[11]], key: 'f13' },
    { vertices: [vertices[11], vertices[2], vertices[10]], key: 'f14' },
    // 5 faces around vertex 3 (bottom region)
    { vertices: [vertices[3], vertices[10], vertices[5]], key: 'f15' },
    { vertices: [vertices[3], vertices[5], vertices[1]], key: 'f16' },
    { vertices: [vertices[3], vertices[1], vertices[7]], key: 'f17' },
    { vertices: [vertices[3], vertices[7], vertices[11]], key: 'f18' },
    { vertices: [vertices[3], vertices[11], vertices[10]], key: 'f19' },
  ], [vertices]);

  // Top faces for bubble spawning (the 5 faces around vertex 0)
  const topFaceIndices = [0, 1, 2, 3, 4];

  return (
    <group position={[0, -2, 0]}>
      <group rotation={[tiltX, 0, 0]}>
        <group ref={spinRef}>
          {faces.map((face) => (
            <IcoFace
              key={face.key}
              vertices={face.vertices}
              color={shapeColor}
            />
          ))}

          {edges.map((edge) => (
            <IcoEdge
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

function Icosahedron3D() {
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
        camera={{ position: [0, 2, 7], fov: 80 }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.5} color="#ffffff" />
        <directionalLight position={[5, 5, 5]} intensity={0.5} color="#ffffff" />

        <IcosahedronShape shapeColor={shapeColor} />

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate={false}
        />
      </Canvas>
    </div>
  );
}

export default Icosahedron3D;

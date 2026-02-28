import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line } from '@react-three/drei';
import * as THREE from 'three';

function CubeEdge({ start, end, color }) {
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

function CubeFace({ vertices, color }) {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    // Quad: split into two triangles
    const positions = [
      ...vertices[0], ...vertices[1], ...vertices[2],
      ...vertices[0], ...vertices[2], ...vertices[3]
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

// Bubbles that float upward off the top of the cube
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

  // Pick a random point on the top face of the cube (vertices 2,3,6,7 — the y=+s face)
  const randomTopPoint = (verts) => {
    const topVerts = [verts[2], verts[3], verts[6], verts[7]];
    const a = new THREE.Vector3(...topVerts[0]);
    const b = new THREE.Vector3(...topVerts[1]);
    const c = new THREE.Vector3(...topVerts[2]);
    const d = new THREE.Vector3(...topVerts[3]);
    // Random point on quad via bilinear interpolation
    const u = Math.random();
    const v = Math.random();
    const ab = a.clone().lerp(b, u);
    const dc = d.clone().lerp(c, u);
    return ab.lerp(dc, v);
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

      // Float upward
      const riseHeight = progress * 3.5;
      sprite.position.y = sprite.userData.startPos.y + riseHeight;

      // Gentle wobble
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

      const s = sprite.userData.size * (1 + progress * 0.3);
      sprite.scale.set(s, s, 1);
    });
  });

  return <group ref={groupRef} />;
}

function CubeShape({ shapeColor }) {
  const group = useRef();

  useFrame(() => {
    if (group.current) {
      group.current.rotation.y += 0.01;
    }
  });

  // Cube vertices: 8 corners of a cube centered at origin
  const vertices = useMemo(() => {
    const s = 1.5;
    return [
      [-s, -s, -s], // 0: bottom-left-back
      [ s, -s, -s], // 1: bottom-right-back
      [ s,  s, -s], // 2: top-right-back
      [-s,  s, -s], // 3: top-left-back
      [-s, -s,  s], // 4: bottom-left-front
      [ s, -s,  s], // 5: bottom-right-front
      [ s,  s,  s], // 6: top-right-front
      [-s,  s,  s], // 7: top-left-front
    ];
  }, []);

  // 12 edges
  const edges = useMemo(() => [
    // Bottom face
    { start: vertices[0], end: vertices[1], key: 'e01' },
    { start: vertices[1], end: vertices[5], key: 'e15' },
    { start: vertices[5], end: vertices[4], key: 'e54' },
    { start: vertices[4], end: vertices[0], key: 'e40' },
    // Top face
    { start: vertices[3], end: vertices[2], key: 'e32' },
    { start: vertices[2], end: vertices[6], key: 'e26' },
    { start: vertices[6], end: vertices[7], key: 'e67' },
    { start: vertices[7], end: vertices[3], key: 'e73' },
    // Verticals
    { start: vertices[0], end: vertices[3], key: 'e03' },
    { start: vertices[1], end: vertices[2], key: 'e12' },
    { start: vertices[5], end: vertices[6], key: 'e56' },
    { start: vertices[4], end: vertices[7], key: 'e47' },
  ], [vertices]);

  // 6 quad faces
  const faces = useMemo(() => [
    { vertices: [vertices[0], vertices[1], vertices[2], vertices[3]], key: 'back' },
    { vertices: [vertices[4], vertices[5], vertices[6], vertices[7]], key: 'front' },
    { vertices: [vertices[3], vertices[2], vertices[6], vertices[7]], key: 'top' },
    { vertices: [vertices[0], vertices[1], vertices[5], vertices[4]], key: 'bottom' },
    { vertices: [vertices[0], vertices[3], vertices[7], vertices[4]], key: 'left' },
    { vertices: [vertices[1], vertices[2], vertices[6], vertices[5]], key: 'right' },
  ], [vertices]);

  return (
    <group ref={group} position={[0, -1.5, 0]}>
      {faces.map((face) => (
        <CubeFace
          key={face.key}
          vertices={face.vertices}
          color={shapeColor}
        />
      ))}

      {edges.map((edge) => (
        <CubeEdge
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

function Cube3D() {
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
        camera={{ position: [0, 2, 9], fov: 60 }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.5} color="#ffffff" />
        <directionalLight position={[5, 5, 5]} intensity={0.5} color="#ffffff" />

        <CubeShape shapeColor={shapeColor} />

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate={false}
        />
      </Canvas>
    </div>
  );
}

export default Cube3D;

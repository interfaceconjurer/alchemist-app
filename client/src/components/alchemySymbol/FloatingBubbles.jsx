import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function FloatingBubbles({ color, spawnPoint, count = 15 }) {
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
    ctx.fillStyle = color === '#ffffff' ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)';
    ctx.fill();
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, [color]);

  useEffect(() => {
    const particles = [];
    for (let i = 0; i < count; i++) {
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: bubbleTexture, transparent: true, opacity: 0,
          depthWrite: false, sizeAttenuation: true,
        })
      );
      const startPos = spawnPoint();
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
      particles.forEach(s => {
        if (s.parent) s.parent.remove(s);
        s.material.dispose();
      });
    };
  }, [bubbleTexture, count, spawnPoint]);

  useFrame((_, delta) => {
    particlesRef.current.forEach((sprite) => {
      sprite.userData.life += delta;
      const { life, maxLife } = sprite.userData;
      const progress = (life % maxLife) / maxLife;

      if (life >= maxLife) {
        sprite.userData.life = 0;
        const newStart = spawnPoint();
        sprite.position.copy(newStart);
        sprite.userData.startPos.copy(newStart);
        sprite.userData.size = 0.12 + Math.random() * 0.08;
        return;
      }

      sprite.position.y = sprite.userData.startPos.y + progress * 3.5;
      sprite.position.x = sprite.userData.startPos.x + Math.sin(life * 2) * 0.15;
      sprite.position.z = sprite.userData.startPos.z + Math.cos(life * 1.5) * 0.1;

      let opacity;
      if (progress < 0.1) opacity = progress * 10;
      else if (progress < 0.6) opacity = 1;
      else opacity = (1 - progress) * 2.5;
      sprite.material.opacity = Math.max(0, opacity * 0.4);

      const s = sprite.userData.size * (1 + progress * 0.3);
      sprite.scale.set(s, s, 1);
    });
  });

  return <group ref={groupRef} />;
}

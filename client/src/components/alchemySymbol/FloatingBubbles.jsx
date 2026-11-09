import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { animationDelta } from './renderPolicy';

function discTexture(fill) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 64, 64);
  ctx.beginPath();
  ctx.arc(32, 32, 24, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * `darkRatio`: fraction of bubbles drawn as dark onyx motes instead of light
 * ones. Each bubble re-rolls light/dark every time it respawns, so the mix
 * drifts rather than the same bubbles always being dark.
 * `darkOpacityScale`: dark motes read much stronger than light ones on a dark
 * background's glow, so they get their own opacity.
 */
export default function FloatingBubbles({
  color, spawnPoint, count = 15, opacityScale = 1,
  darkRatio = 0, darkColor = '#0b0c0f', darkOpacityScale = 1.4, animationTime,
  // Optional ref (0..1): fades every bubble together (dormancy).
  visibility,
}) {
  const particlesRef = useRef([]);
  const groupRef = useRef();
  const previousTime = useRef(animationTime?.value ?? 0);
  useEffect(() => { previousTime.current = animationTime?.value ?? 0; }, [animationTime]);

  const bubbleTexture = useMemo(
    () => discTexture(color === '#ffffff' ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)'),
    [color],
  );
  const darkTexture = useMemo(() => discTexture(darkColor), [darkColor]);

  const roll = (sprite) => {
    const dark = Math.random() < darkRatio;
    sprite.userData.dark = dark;
    sprite.material.map = dark ? darkTexture : bubbleTexture;
    sprite.material.needsUpdate = true;
    // Dark motes are a touch smaller and denser-looking.
    sprite.userData.size = (dark ? 0.09 : 0.12) + Math.random() * (dark ? 0.06 : 0.08);
  };

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
      sprite.userData = {
        life: Math.random() * 4,
        maxLife: 3 + Math.random() * 2,
        startPos: startPos.clone(),
      };
      roll(sprite);
      sprite.scale.set(sprite.userData.size, sprite.userData.size, 1);
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
    // roll() closes over darkRatio/textures; re-create sprites when they change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bubbleTexture, darkTexture, darkRatio, count, spawnPoint]);

  useEffect(() => () => { bubbleTexture.dispose(); darkTexture.dispose(); }, [bubbleTexture, darkTexture]);

  useFrame((_, frameDelta) => {
    const delta = animationTime
      ? animationDelta(animationTime.value - previousTime.current)
      : animationDelta(frameDelta);
    if (animationTime) previousTime.current = animationTime.value;
    particlesRef.current.forEach((sprite) => {
      sprite.userData.life += delta;
      const { life, maxLife } = sprite.userData;
      const progress = (life % maxLife) / maxLife;

      if (life >= maxLife) {
        sprite.userData.life = 0;
        const newStart = spawnPoint();
        sprite.position.copy(newStart);
        sprite.userData.startPos.copy(newStart);
        roll(sprite);
        return;
      }

      sprite.position.y = sprite.userData.startPos.y + progress * 3.5;
      sprite.position.x = sprite.userData.startPos.x + Math.sin(life * 2) * 0.15;
      sprite.position.z = sprite.userData.startPos.z + Math.cos(life * 1.5) * 0.1;

      let opacity;
      if (progress < 0.1) opacity = progress * 10;
      else if (progress < 0.6) opacity = 1;
      else opacity = (1 - progress) * 2.5;
      const scale = sprite.userData.dark ? darkOpacityScale : opacityScale;
      sprite.material.opacity = Math.max(0, opacity * 0.4 * scale * (visibility ? visibility.current : 1));

      const s = sprite.userData.size * (1 + progress * 0.3);
      sprite.scale.set(s, s, 1);
    });
  });

  return <group ref={groupRef} />;
}

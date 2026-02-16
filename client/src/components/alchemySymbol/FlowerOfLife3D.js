import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// Create a sphere with theme-aware outline and transparent fill
function OutlinedSphere({ position, radius = 0.8, delay = 0, animationProgress, index = 0, isSeedOfLife = false, wireframeColor, fillOpacity, isDark, emissiveColor }) {
  const groupRef = useRef();
  const meshRef = useRef();
  const fillRef = useRef();

  useFrame((state) => {
    if (groupRef.current) {
      // Calculate progress with delay for ripple effect
      const adjustedProgress = Math.max(0, Math.min(1, (animationProgress - delay) * 3));

      // Apply smooth easing curve
      const easedProgress = adjustedProgress < 0.5
        ? 2 * adjustedProgress * adjustedProgress
        : 1 - Math.pow(-2 * adjustedProgress + 2, 2) / 2;

      // Scale animation - expand from center
      const scale = easedProgress;
      groupRef.current.scale.set(scale, scale, scale);

      // Wireframe opacity animation - higher opacity for Seed of Life
      if (meshRef.current && meshRef.current.material) {
        const maxOpacity = isSeedOfLife ? 1.0 : 0.8;
        // Add pulsing effect in dark mode
        const pulse = isDark ? (1 + Math.sin(state.clock.elapsedTime * 3 + index) * 0.1) : 1;
        meshRef.current.material.opacity = easedProgress * maxOpacity * pulse;

        // Subtle pulsing emissive intensity
        const emissivePulse = 1 + Math.sin(state.clock.elapsedTime * 4 + index * 0.5) * 0.2;
        if (isDark) {
          meshRef.current.material.emissiveIntensity = (isSeedOfLife ? 0.8 : 0.3) * emissivePulse * easedProgress;
        } else {
          // Light mode with purple glow
          meshRef.current.material.emissiveIntensity = (isSeedOfLife ? 0.3 : 0.15) * emissivePulse * easedProgress;
        }
      }

      // Fill opacity animation - more prominent for Seed of Life
      if (fillRef.current && fillRef.current.material) {
        const fillProgress = Math.max(0, (easedProgress - 0.3)) / 0.7;
        const maxFillOpacity = isSeedOfLife ? fillOpacity.seed : fillOpacity.base;
        fillRef.current.material.opacity = fillProgress * maxFillOpacity;

        // Subtle pulsing emissive for fill
        const emissivePulse = 0.8 + Math.sin(state.clock.elapsedTime * 3 + index * 0.3) * 0.2;
        if (isDark) {
          fillRef.current.material.emissiveIntensity = (isSeedOfLife ? 0.25 : 0.1) * emissivePulse * fillProgress;
        } else {
          // Light mode with purple glow
          fillRef.current.material.emissiveIntensity = (isSeedOfLife ? 0.15 : 0.08) * emissivePulse * fillProgress;
        }
      }
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Add a point light to the center sphere for extra brightness */}
      {isSeedOfLife && (
        <pointLight
          color={isDark ? "#ffffff" : "#000000"}
          intensity={(isDark ? 0.5 : 0.2) * animationProgress}
          distance={3}
          decay={2}
        />
      )}
      {/* Wireframe sphere - more lines for Seed of Life */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[radius, isSeedOfLife ? 8 : 6, isSeedOfLife ? 6 : 4]} />
        <meshStandardMaterial
          color={isSeedOfLife && !isDark ? '#000000' : wireframeColor}
          emissive={isSeedOfLife ? (isDark ? '#ffffff' : '#000000') : emissiveColor}
          emissiveIntensity={isSeedOfLife ? (isDark ? 2.5 : 0.3) : (isDark ? 1.0 : 0.2)}
          wireframe={true}
          transparent={true}
          opacity={0}
          metalness={isSeedOfLife ? 0.4 : 0.2}
          roughness={isSeedOfLife ? 0.3 : 0.5}
        />
      </mesh>

      {/* Filled sphere with transparency */}
      <mesh ref={fillRef}>
        <sphereGeometry args={[radius * 0.98, 32, 16]} />
        <meshStandardMaterial
          color={isSeedOfLife && !isDark ? '#000000' : wireframeColor}
          emissive={isSeedOfLife ? (isDark ? '#ffffff' : '#000000') : emissiveColor}
          emissiveIntensity={isSeedOfLife ? (isDark ? 0.6 : 0.15) : (isDark ? 0.3 : 0.1)}
          transparent
          opacity={0}
          side={THREE.DoubleSide}
          depthWrite={false}
          metalness={0}
          roughness={1}
        />
      </mesh>
    </group>
  );
}

// Emanating particle system - particles radiating from the flower
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
    purpleCtx.fillStyle = 'rgba(139, 0, 255, 0.8)'; // Purple with higher opacity for visibility
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
    centerCtx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.8)'; // White in dark, black in light
    centerCtx.fill();
    const centerTexture = new THREE.CanvasTexture(centerCanvas);
    centerTexture.needsUpdate = true;

    return { purple: purpleTexture, center: centerTexture };
  }, [isDark]);

  // Initialize particles
  useEffect(() => {
    const particles = [];
    for (let i = 0; i < 25; i++) {
      // Determine if this particle should be center color (white/black) or purple (from outer)
      const isFromCenter = i < 10; // First 10 particles are from center
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

      // Start at center of flower
      sprite.position.set(0, 0, 0);

      // Random direction for emanation
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = 0.015 + Math.random() * 0.02;

      // Custom properties for animation
      sprite.userData = {
        velocity: new THREE.Vector3(
          Math.sin(phi) * Math.cos(theta) * speed,
          Math.sin(phi) * Math.sin(theta) * speed,
          Math.cos(phi) * speed
        ),
        life: Math.random(), // Stagger the start times
        maxLife: 2 + Math.random() * 2,
        size: 0.05 + Math.random() * 0.08, // Smaller particles
        startPosition: new THREE.Vector3(0, 0, 0),
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
      sprite.userData.life += delta * 0.5; // Slower lifecycle

      // Calculate lifecycle progress (0 to 1)
      const progress = (sprite.userData.life % sprite.userData.maxLife) / sprite.userData.maxLife;

      // Reset when cycle completes
      if (sprite.userData.life >= sprite.userData.maxLife) {
        sprite.userData.life = 0;

        // Pick a position based on particle type
        if (sprite.userData.isFromCenter) {
          // Center particles always start from center
          sprite.userData.startPosition.set(0, 0, 0);
        } else {
          // Purple particles start from random positions in the flower
          const angle = Math.random() * Math.PI * 2;
          const radius = 0.5 + Math.random() * 1.0; // From mid to outer radius
          sprite.userData.startPosition.set(
            Math.cos(angle) * radius,
            Math.sin(angle) * radius,
            (Math.random() - 0.5) * 0.5
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
      const distance = progress * 2; // Reduced distance so particles fade before edge
      sprite.position.copy(sprite.userData.startPosition);
      sprite.position.addScaledVector(sprite.userData.velocity, distance * 100);

      // Opacity fades in and out
      let opacity = 0;
      if (progress < 0.1) {
        opacity = progress * 10; // Fade in quickly
      } else if (progress < 0.5) {
        opacity = 1; // Full opacity
      } else {
        opacity = (1 - progress) * 2; // Fade out earlier
      }

      // Center particles are slightly more opaque
      const baseOpacity = sprite.userData.isFromCenter ? 0.7 : 0.5;
      sprite.material.opacity = opacity * baseOpacity * animationProgress;

      // Scale pulses slightly (more subtle for smaller particles)
      const scalePulse = 1 + Math.sin(state.clock.elapsedTime * 3 + index) * 0.1;
      const scale = sprite.userData.size * scalePulse * (1 - progress * 0.3); // Shrink as it travels
      sprite.scale.set(scale, scale, 1);
    });
  });

  return <group ref={groupRef} />;
}

// Main Flower of Life pattern component
function FlowerOfLifePattern({ wireframeColor, fillOpacity, isDark, emissiveColor, animationProgress }) {
  const group = useRef();
  const containerRef = useRef();
  const containerGroupRef = useRef();

  // Rotate the entire pattern
  useFrame((state) => {
    if (group.current) {
      group.current.rotation.z += 0.002; // Slow z-axis rotation (spinning like a wheel)
    }

    // Animate container sphere with scale and opacity
    if (containerGroupRef.current) {
      // Scale the container sphere
      containerGroupRef.current.scale.set(animationProgress, animationProgress, animationProgress);

      // Animate opacity
      if (containerRef.current && containerRef.current.material) {
        containerRef.current.material.opacity = animationProgress * 0.15;
      }
    }
  });

  // Generate positions for spheres in classic Flower of Life pattern
  const spherePositions = useMemo(() => {
    const positions = [];
    const spacing = 1.3; // Distance between sphere centers (equals sphere radius for touching spheres)

    // Center sphere
    positions.push([0, 0, 0]);

    // First ring - 6 spheres around center (these overlap with center to create petals)
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI * 2) / 6;
      positions.push([
        Math.cos(angle) * spacing,
        Math.sin(angle) * spacing,
        0
      ]);
    }

    // Second ring - 6 spheres at 30-degree offset, distance of 2*spacing from center
    // These sit between the first ring spheres
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI * 2) / 6 + Math.PI / 6;
      positions.push([
        Math.cos(angle) * spacing * 1.732, // spacing * sqrt(3)
        Math.sin(angle) * spacing * 1.732,
        0
      ]);
    }

    // Third ring - 6 more spheres completing the outer pattern
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI * 2) / 6;
      positions.push([
        Math.cos(angle) * spacing * 2,
        Math.sin(angle) * spacing * 2,
        0
      ]);
    }

    return positions;
  }, []);

  return (
    <group ref={group}>
      {/* Container sphere - minimal lines */}
      <group ref={containerGroupRef}>
        <mesh ref={containerRef}>
          <sphereGeometry args={[2.75, 12, 8]} />
          <meshStandardMaterial
            color={wireframeColor}
            emissive={isDark ? emissiveColor : '#000000'}
            emissiveIntensity={isDark ? 0.15 : 0}
            wireframe={true}
            transparent={true}
            opacity={0}
            side={THREE.DoubleSide}
            metalness={isDark ? 0.2 : 0}
            roughness={isDark ? 0.6 : 1}
          />
        </mesh>
      </group>

      {/* Inner Flower of Life pattern - scaled to fit perfectly */}
      <group scale={[0.7, 0.7, 0.7]}>
        {spherePositions.map((position, index) => {
          // Calculate delay based on distance from center for ripple effect
          const distance = Math.sqrt(position[0] ** 2 + position[1] ** 2 + position[2] ** 2);
          const maxDistance = 2.6; // Maximum distance in our pattern

          // Seed of Life: center (index 0) and first ring (indices 1-6) are more prominent
          const isSeedOfLife = index <= 6;

          // Larger radius for Seed of Life spheres
          const sphereRadius = index === 0 ? 1.5 : (index <= 6 ? 1.4 : 1.3);

          // Less delay for Seed of Life to make them appear faster
          const delay = index === 0 ? 0 : (isSeedOfLife ? (distance / maxDistance) * 0.2 : (distance / maxDistance) * 0.4);

          return (
            <OutlinedSphere
              key={`sphere-${index}`}
              position={position}
              radius={sphereRadius}
              delay={delay}
              animationProgress={animationProgress}
              index={index}
              isSeedOfLife={isSeedOfLife}
              wireframeColor={wireframeColor}
              fillOpacity={fillOpacity}
              isDark={isDark}
              emissiveColor={emissiveColor}
            />
          );
        })}
      </group>
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
      <FlowerOfLifePattern
        wireframeColor={themeColors.wireframeColor}
        fillOpacity={themeColors.fillOpacity}
        isDark={themeColors.isDark}
        emissiveColor={themeColors.emissiveColor}
        animationProgress={animationProgress}
      />

      {/* Atmospheric effects - particles emanating from the sacred geometry */}
      <EmanatingParticles animationProgress={animationProgress} isDark={themeColors.isDark} />
    </>
  );
}

// Main component that sets up the 3D scene
function FlowerOfLife3D() {
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
        camera={{ position: [0, 0, 5.5], fov: 60 }}
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

export default FlowerOfLife3D;
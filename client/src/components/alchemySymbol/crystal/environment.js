import * as THREE from 'three/webgpu';

/**
 * A tiny procedural "studio" for the crystal to reflect/refract: a black void
 * with a few bright softbox strips. Dark glass reads as glass only when it has
 * crisp highlights to catch, so this matters more than any texture.
 */
export function createStudioEnvironment(renderer) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020203);

  const panel = (w, h, hex, intensity, position, lookAt = [0, 0, 0]) => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(intensity), side: THREE.DoubleSide }),
    );
    mesh.position.set(...position);
    mesh.lookAt(...lookAt);
    scene.add(mesh);
  };

  // Thin, neutral strips: narrow bright edges are what dispersion fans into rainbows.
  panel(5, 0.35, '#ffffff', 2.2, [0, 6, 2]); // key strip overhead
  panel(0.35, 7, '#ffffff', 1.4, [-6, 0.5, 1]); // side strip
  panel(0.3, 7, '#ffffff', 1.1, [6, -0.5, -1]); // opposite side strip
  panel(0.25, 5, '#ffffff', 0.9, [2.5, 0, -7]); // back kicker

  const pmrem = new THREE.PMREMGenerator(renderer);
  const target = pmrem.fromScene(scene, 0.02);
  pmrem.dispose();
  scene.traverse((o) => {
    o.geometry?.dispose();
    o.material?.dispose();
  });
  return target;
}

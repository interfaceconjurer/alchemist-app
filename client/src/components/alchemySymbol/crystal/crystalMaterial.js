import * as THREE from 'three/webgpu';
import {
  abs,
  cameraPosition,
  dot,
  float,
  fract,
  max,
  mix,
  mx_worley_noise_vec2,
  normalize,
  normalWorld,
  normalWorldGeometry,
  oneMinus,
  pmremTexture,
  positionLocal,
  positionWorld,
  pow,
  reflect,
  refract,
  smoothstep,
  time,
  uniform,
  vec3,
  attribute,
  cameraViewMatrix,
  fwidth,
  min,
  mx_fractal_noise_float,
  sign,
  vec4,
  saturate,
} from 'three/tsl';

const clamp01 = (x) => saturate(x);
import { tslExports } from 'vgpu/three';
import crystalModule from './crystal.wgsl';
import { spectralWeights, spectrumRgb } from './spectrum';
import { backlightMix, transmittedBacklight } from './backlight';

// vgpu WGSL exports → callable TSL nodes. Only valid on the WebGPU backend.
const { onyxBands, onyxFracture, onyxScratches, onyxHeight, crystalMist } = tslExports(crystalModule)(
  'onyxBands', 'onyxFracture', 'onyxScratches', 'onyxHeight', 'crystalMist',
);

// Number of wavelengths traced through the glass. More = smoother rainbow fans.
const WAVELENGTHS = 10;
const WEIGHTS = spectralWeights(WAVELENGTHS);

// Narrow "light sources" the prism splits. World-space directions; the solid
// spins under them, so the spectral bands sweep across its facets.
const LIGHTS = [
  { dir: [0.35, 0.85, 0.4], sharpness: 40, strength: 0.9 },
  { dir: [-0.8, 0.15, 0.55], sharpness: 50, strength: 0.6 },
  { dir: [0.6, -0.4, 0.7], sharpness: 45, strength: 0.5 },
  { dir: [-0.2, 0.3, -0.95], sharpness: 45, strength: 0.45 },
];

/**
 * Onyx surface fields. On WebGPU these come from vgpu WGSL (crystal.wgsl).
 * On the WebGL2 fallback WGSL can't compile, so three's MaterialX noise nodes
 * give a simpler approximation of the same layers.
 */
function fields(p, useWgsl) {
  if (useWgsl) {
    const t = { position: p, timeSeconds: time };
    const at = { position: p };
    return {
      bands: onyxBands(t),
      fracture: onyxFracture(at),
      scratches: onyxScratches(at),
      height: onyxHeight(at),
      mist: crystalMist(t),
    };
  }
  const warp = mx_fractal_noise_float(p.mul(0.55), 4).mul(0.9);
  const ring = p.add(warp).length().mul(5.5 * 6.2831855).cos().mul(0.5).add(0.5);
  const w = mx_worley_noise_vec2(p.mul(9), 1);
  return {
    bands: ring.pow(18).add(ring.pow(3).mul(0.28)),
    fracture: oneMinus(smoothstep(0, 0.12, w.y.sub(w.x))).mul(0.7),
    scratches: float(0),
    height: mx_fractal_noise_float(p.mul(1.6), 3).mul(0.7),
    mist: float(0.5),
  };
}

/**
 * 0 at a real polygon edge → 1 a little way into the face, from the
 * per-triangle barycentric + edge-mask attributes written by MorphingSolid.
 * Uses screen-space derivatives so the band has a stable world width.
 */
function edgeProximity(widthWorld) {
  const bary = attribute('bary', 'vec3');
  const mask = attribute('edgeMask', 'vec3');
  // Non-edge sides get pushed "far away" so fan diagonals never show.
  const d = bary.add(oneMinus(mask).mul(10));
  const nearest = min(d.x, min(d.y, d.z));
  // Convert barycentric distance to ~world units using its screen derivative
  // against the world-position derivative.
  const perPx = fwidth(nearest);
  const worldPerPx = fwidth(positionWorld).length();
  const dist = nearest.div(max(perPx, 1e-5)).mul(worldPerPx);
  return smoothstep(0, widthWorld, dist);
}

/**
 * Dark faceted glass that behaves like a prism.
 *
 * For each of N wavelengths the view ray is refracted with its own IOR
 * (red bends least, violet most). Each wavelength's ray is then tested
 * against a few narrow light directions and against the environment, and
 * weighted by that wavelength's colour. Where the rays agree you get neutral
 * light; where they diverge the light fans out into a spectrum.
 *
 * A small position-dependent bend fakes curvature across each flat face so
 * the fan resolves into bands instead of tinting a whole face one hue.
 */
/**
 * Light mode lifts the glass from near-black to a smoky grey a few steps darker
 * than the page, mirroring how dark mode sits a few steps darker than black:
 * the solid reads by its highlights and backlight, not by silhouette contrast.
 */
export const LIGHT_BODY = [0.15, 0.155, 0.168]; // linear, before tone mapping; dark smoky stone, ~60 levels under the #c6c7ca page

/**
 * Bump the world-space normal by a scalar height field using screen-space
 * derivatives (Mikkelsen's surface-gradient method). Works on any procedural
 * height, no UVs needed.
 */
function bumpedNormal(n, height, strength) {
  const pos = positionWorld;
  const sx = pos.dFdx();
  const sy = pos.dFdy();
  const r1 = sy.cross(n);
  const r2 = n.cross(sx);
  const det = sx.dot(r1);
  const h = height.mul(strength);
  const grad = sign(det).mul(h.dFdx().mul(r1).add(h.dFdy().mul(r2)));
  return normalize(abs(det).mul(n).sub(grad));
}

/**
 * `side`: FrontSide for the outer surface, BackSide for the far inner faces
 * seen *through* the stone. With `transparent`, coverage varies across the
 * surface: polished dark areas are glassy, milky bands and chipped rims are
 * near-opaque, and grazing angles (Fresnel) turn reflective and solid.
 */
export function createCrystalMaterial({
  envTexture, useWgsl = true, uLight = uniform(0), withEdges = false,
  side = THREE.FrontSide, transparent = false, uClarity = uniform(0.55),
}) {
  const uDispersion = uniform(0.22); // red→violet IOR spread (exaggerated vs real glass, but restrained)
  const uBandGain = uniform(0.4);
  const uBandSaturation = uniform(0.5); // 0 = white glints, 1 = full rainbow
  const uEnvGain = uniform(0.6);
  const uVeinGlow = uniform(0.2);
  const uBacklight = uniform(0.6);

  const uOnyxBands = uniform(0.6); // milky chalcedony banding
  const uFracture = uniform(1.0); // glittery broken zones along the edges
  const uScratches = uniform(0.22); // hairline scratches on the polish
  const uBump = uniform(0.02); // surface undulation / pitting

  const p = positionLocal.mul(1.1);
  const f = fields(p, useWgsl);

  // Fracture zone: a ragged band along the real polygon edges, widest where
  // the fracture noise is strong — like the chipped, conchoidal rims in onyx.
  const chipped = smoothstep(-0.1, 0.45, f.height); // some stretches of edge chip deeply, others barely
  const nearEdge = withEdges ? oneMinus(edgeProximity(float(0.06).add(chipped.mul(0.32)))) : float(0);
  const fractureZone = nearEdge.mul(uFracture);

  // Polish undulates gently; fracture zones get a much rougher, faceted bump.
  const height = f.height.add(f.fracture.mul(fractureZone).mul(3.5));
  // Bump the *geometry* normal: normalWorld is derived from material.normalNode,
  // so building normalNode from it would be a cycle.
  // Inner (back) faces are seen from inside the stone: flip so they face the viewer.
  const nGeom = normalize(normalWorldGeometry).mul(side === THREE.BackSide ? -1 : 1).toVar();
  const n = bumpedNormal(nGeom, height, uBump.mul(mix(1, 6, fractureZone))).toVar();

  const viewDir = normalize(positionWorld.sub(cameraPosition));
  const baseIor = float(1.5);
  // Fake internal curvature so rays vary across a flat facet.
  const bend = p.mul(0.22);

  const lights = LIGHTS.map((l) => ({ ...l, dir: normalize(vec3(...l.dir)) }));

  let bands = vec3(0);
  let envLight = vec3(0);
  let midRay = null;
  WEIGHTS.forEach((w, i) => {
    const t = (i + 0.5) / WAVELENGTHS - 0.5; // -0.5 (red) … +0.5 (violet)
    const ior = baseIor.add(uDispersion.mul(t));
    const ray = normalize(refract(viewDir, nGeom, float(1).div(ior)).add(bend));
    const weight = vec3(...w);
    if (i === Math.floor(WAVELENGTHS / 2)) midRay = ray;

    lights.forEach((l) => {
      const hit = pow(max(dot(ray, l.dir), 0), l.sharpness).mul(l.strength);
      bands = bands.add(weight.mul(hit));
    });
    envLight = envLight.add(pmremTexture(envTexture, ray, float(0.05)).rgb.mul(weight));
  });

  const facing = abs(dot(viewDir, n));
  const fresnel = pow(oneMinus(facing), 3.0);
  const mist = f.mist;

  // Milky banding: translucent grey-white layers inside the black stone. They
  // catch a little of the environment and scatter the backlight.
  const bandTint = vec3(0.52, 0.54, 0.58);
  const bandLight = bandTint.mul(f.bands).mul(uOnyxBands).mul(mix(0.55, 1.0, mist));

  // Fracture rims: sparkly broken stone. Glints are the reflected studio,
  // gated by the high-frequency facet pattern so they twinkle as it turns.
  const reflected = pmremTexture(envTexture, reflect(viewDir, n), float(0.18)).rgb;
  const glint = pow(f.fracture, 3).mul(fractureZone);
  const fractureLight = reflected.mul(glint).mul(0.9).add(vec3(0.07, 0.075, 0.085).mul(fractureZone));

  // Hairline scratches: faint, only visible where they catch the light.
  const scratchLight = vec3(0.6, 0.62, 0.66).mul(f.scratches).mul(uScratches).mul(mix(0.35, 1.0, fresnel));

  // Kept so the earlier "vein" knobs still mean something: veins = bands now.
  const veinLight = bandLight.mul(uVeinGlow.mul(5));

  const glassBody = envLight.mul(uEnvGain).mul(mix(0.6, 1.0, mist));

  // Coloured light from behind, seen through the stone. Thin faces near the
  // silhouette transmit more (fresnel), and the translucent bands carry it —
  // dark polished areas stay dark, as in real onyx.
  const backlit = transmittedBacklight(midRay, { sharpness: 3.5 })
    .mul(mix(0.1, 1.0, fresnel))
    .mul(mix(0.55, 1.1, mist))
    .mul(uBacklight);
  const backlitCracks = backlightMix(0.18).mul(f.bands).mul(uOnyxBands).mul(uBacklight);

  // Rim picks up whichever backlight colours are currently up.
  const rim = vec3(0.45, 0.48, 0.55).mul(0.06).add(backlightMix(0.22)).mul(fresnel);

  const material = new THREE.MeshPhysicalNodeMaterial({
    color: 0x020203,
    metalness: 0,
    roughness: 0.08,
    clearcoat: 0.3,
    clearcoatRoughness: 0.1,
    iridescence: 0.12,
    iridescenceIOR: 1.6,
    iridescenceThicknessMinimum: 250,
    iridescenceThicknessMaximum: 700,
    envMapIntensity: 0.25,
    side,
    transparent,
    depthWrite: !transparent,
  });
  material.envMap = envTexture;
  if (transparent) {
    // How much of what's behind shows through: clear in polished areas,
    // clouded by banding, mist and chips, and closing up at grazing angles.
    // Mist varies a lot across the face, so clarity is patchy, like real stone.
    const cloud = f.bands.mul(uOnyxBands).mul(1.4).add(fractureZone.mul(0.8)).add(smoothstep(0.4, 0.85, mist).mul(0.28));
    const through = uClarity.mul(oneMinus(fresnel)).mul(oneMinus(clamp01(cloud)));
    material.opacityNode = clamp01(oneMinus(through));
  }
  if (side === THREE.BackSide) {
    // Seen through the near face, the far side reads as deeper and darker stone.
    material.emissiveNode = null; // set below, then dimmed
  }
  // Real surface response follows the bumped normal; fracture rims go matte-sparkly.
  material.normalNode = normalize(cameraViewMatrix.mul(vec4(n, 0)).xyz);
  material.roughnessNode = mix(float(0.07), float(0.5), fractureZone);
  material.clearcoatRoughnessNode = mix(float(0.08), float(0.6), fractureZone);
  // Everything that passed through the prism (body refraction + highlight bands)
  // is pulled toward its own luminance, so dispersion reads as a hint of colour
  // at the edges of highlights rather than a full rainbow.
  const prismLight = glassBody.add(bands.mul(uBandGain));
  const prismLuma = dot(prismLight, vec3(0.2126, 0.7152, 0.0722));
  const softPrism = mix(vec3(prismLuma), prismLight, uBandSaturation);

  const lit = softPrism.add(veinLight).add(fractureLight).add(scratchLight).add(backlit).add(backlitCracks).add(rim);
  // Light mode: a smoky-grey body, with the lighting layered on top at reduced
  // strength so highlights stay soft against the grey page.
  // Keep the full lighting (highlights, prism, backlight) so the facets read the
  // way they do in dark mode; just raise the floor from black to smoky grey.
  const lightLook = vec3(...LIGHT_BODY).mul(mix(0.85, 1.08, mist)).add(lit.mul(0.95));
  material.emissiveNode = mix(lit, lightLook, uLight);
  if (side === THREE.BackSide) {
    // Depth falloff: the far wall is darker and the light-mode body sinks
    // toward black, so looking into the stone feels deep.
    material.emissiveNode = mix(lit.mul(0.55), vec3(...LIGHT_BODY).mul(0.55).add(lit.mul(0.45)), uLight);
  }

  return { material, uniforms: { uDispersion, uBandGain, uBandSaturation, uEnvGain, uVeinGlow, uBacklight, uLight, uOnyxBands, uFracture, uScratches, uBump, uClarity } };
}

/**
 * Edge/vertex material: the bevelled edge of a dark glass solid.
 * Mostly black; it only shows where a glancing angle catches a reflection
 * (Fresnel × environment), with a faint spectral tint at the very rim.
 */
export function createFilamentMaterial({ envTexture, intensity = 1, uLight = uniform(0) } = {}) {
  const material = new THREE.MeshBasicNodeMaterial();
  const viewDir = normalize(positionWorld.sub(cameraPosition));
  const n = normalWorld;
  const grazing = pow(oneMinus(abs(dot(viewDir, n))), 2.5);
  const reflected = envTexture
    ? pmremTexture(envTexture, reflect(viewDir, n), float(0.12)).rgb
    : vec3(0.6);
  const hue = fract(positionWorld.y.mul(0.1).add(positionWorld.x.mul(0.04)).add(time.mul(0.03)));
  const tint = mix(vec3(0.8, 0.82, 0.88), spectrumRgb(hue), 0.15);
  const base = vec3(0.035, 0.038, 0.045); // dark glass body of the edge
  const caught = reflected.mul(tint).mul(0.55).add(backlightMix(0.35)).mul(grazing);
  // Light mode: edges are a slightly darker grey than the body, so facets read
  // as bevels without drawing a dark outline around the solid.
  const lightBase = vec3(...LIGHT_BODY).mul(0.72);
  material.colorNode = mix(base, lightBase, uLight).add(caught.mul(mix(1, 0.85, uLight))).mul(intensity);
  return material;
}

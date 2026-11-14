import { color, float, max, normalize, sin, smoothstep, time, vec3 } from 'three/tsl';

/**
 * Coloured lights placed *behind* the solid (relative to the camera). Each one
 * slowly breathes in and out on its own cycle, so the glass is lit from behind
 * by a drifting mix of hues — sometimes one colour, sometimes two blending,
 * occasionally almost dark.
 *
 * Directions are world-space (camera looks down -Z), so the lights stay behind
 * the solid while it spins in front of them.
 */
const BACKLIGHTS = [
  { hex: '#6d4dff', dir: [-0.55, 0.35, -1], period: 11, phase: 0.0 }, // violet
  { hex: '#19c3ff', dir: [0.6, -0.15, -1], period: 13, phase: 2.1 }, // cyan
  { hex: '#ff3d8b', dir: [0.15, 0.75, -1], period: 17, phase: 4.4 }, // rose
];

/** 0..1 breathing envelope with soft dark gaps between pulses. */
function fade({ period, phase }, animationTime) {
  const wave = sin(animationTime.mul((Math.PI * 2) / period).add(phase)).mul(0.5).add(0.5);
  return smoothstep(0.15, 1.0, wave);
}

/** Shared TSL nodes so every material breathes in sync. */
function backlightNodes(animationTime = time) {
  return BACKLIGHTS.map((l) => ({
    color: color(l.hex),
    dir: normalize(vec3(...l.dir)),
    fade: fade(l, animationTime),
  }));
}

/**
 * Light transmitted through the glass from the backlights, for a ray that has
 * been refracted into the solid. `sharpness` controls how broad the glow is.
 */
export function transmittedBacklight(ray, { sharpness = 5, gain = 1, animationTime = time } = {}) {
  return backlightNodes(animationTime).reduce(
    (acc, l) => acc.add(l.color.mul(l.fade).mul(max(ray.dot(l.dir), 0).pow(sharpness))),
    vec3(0),
  ).mul(gain);
}

/** Sum of the current backlight colours (for rims, edges, and the halo). */
export function backlightMix(gain = 1, animationTime = time) {
  return backlightNodes(animationTime).reduce((acc, l) => acc.add(l.color.mul(l.fade)), vec3(0)).mul(float(gain));
}

/**
 * Soft additive glow card that sits behind the solid. Each backlight paints an
 * offset radial blob in its colour, so the halo shifts hue as they breathe.
 */
export function createHaloColorNode(uvNode, gain = 0.35, animationTime = time) {
  return backlightNodes(animationTime).reduce((acc, l, i) => {
    const src = BACKLIGHTS[i].dir;
    // Offset each blob toward its light's screen direction.
    const center = vec3(0.5 + src[0] * 0.14, 0.5 + src[1] * 0.14, 0);
    const d = uvNode.sub(center.xy).length();
    // Gaussian falloff, windowed to exactly zero before the card's edge so the
    // square plane never shows on a light background.
    const blob = d.mul(d).mul(-14).exp().mul(smoothstep(0.48, 0.3, d));
    return acc.add(l.color.mul(l.fade).mul(blob));
  }, vec3(0)).mul(gain);
}

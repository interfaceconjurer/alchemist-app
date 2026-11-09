// Procedural fields for the onyx solids.
// Authored as pure WGSL functions so vgpu/three can expose them as TSL nodes.
//
// Reference: banded black onyx — polished faces with concentric, wavy
// chalcedony banding; conchoidal, glittery fracture zones along the edges;
// fine hairline scratches across the polish.
import { voronoi3d } from "@vgpu/wgsl-std/noise";
import { fbmSimplex3d, simplex3d } from "@vgpu/wgsl-std/noise/simplex";

// Concentric agate banding. Distance from a few slowly-warped "growth
// centres" drives a sine ladder, so bands bunch, wander and pinch like real
// layered chalcedony rather than repeating evenly. Returns 0..1 (1 = bright band line).
export fn onyxBands(position: vec3f, timeSeconds: f32) -> f32 {
  let p = position + vec3f(0.0, timeSeconds * 0.01, 0.0);
  // Strong low-frequency warp: makes the rings wavy and irregular.
  let warp = vec3f(
    fbmSimplex3d(p * 0.55 + vec3f(3.1, 0.0, 0.0), 4, 2.0, 0.5),
    fbmSimplex3d(p * 0.55 + vec3f(0.0, 7.7, 0.0), 4, 2.0, 0.5),
    fbmSimplex3d(p * 0.55 + vec3f(0.0, 0.0, 1.9), 4, 2.0, 0.5),
  );
  let q = p + warp * 0.9;
  // Two growth centres; take the nearer so ring systems meet in a seam.
  let d = min(length(q - vec3f(0.9, 0.6, -0.4)), length(q - vec3f(-1.1, -0.5, 0.7)) * 1.15);
  // Layered chalcedony: groups of 3–4 fine parallel lines with milky haze
  // between them, like the reference — not single thick ribbons.
  let spacing = 2.2 + simplex3d(q * 0.6) * 0.6;
  let coarse = 0.5 + 0.5 * cos(d * spacing * 6.2831855);
  let fine = 0.5 + 0.5 * cos(d * spacing * 4.0 * 6.2831855 + simplex3d(q * 3.0) * 1.5);
  let group = smoothstep(0.55, 0.95, coarse);
  let line = pow(fine, 14.0) * group;
  let shoulder = group * 0.18;
  // Banding only appears in a few patches; most of the stone is clear black polish.
  let patchiness = fbmSimplex3d(q * 0.35 + vec3f(5.0), 3, 2.0, 0.5) * 0.5 + 0.5;
  let mask = smoothstep(0.46, 0.66, patchiness);
  return clamp((line + shoulder) * mask, 0.0, 1.0);
}

// Conchoidal fracture texture: small faceted cells whose boundaries catch
// light. Returns 0..1 roughness/glitter amount at this point (before masking
// to edges, which the material does using distance to the solid's edges).
export fn onyxFracture(position: vec3f) -> f32 {
  // Chunky conchoidal chips: big cells, each a slightly tilted scoop. The
  // value is a per-chip "height" with a sharp ridge between chips.
  let warped = position * 4.2 + vec3f(simplex3d(position * 2.0) * 0.8);
  let cells = voronoi3d(warped);
  let scoop = smoothstep(0.0, 0.55, cells.f1); // dish-shaped inside each chip
  let ridge = 1.0 - smoothstep(0.0, 0.07, cells.f2 - cells.f1);
  // Fine crystalline sparkle on the broken surfaces.
  let glitter = smoothstep(0.62, 0.95, simplex3d(position * 46.0) * 0.5 + 0.5);
  return clamp(scoop * 0.55 + ridge * 0.6 + glitter * 0.5, 0.0, 1.0);
}

// Hairline scratches: thin, long, randomly oriented streaks. Built by
// stretching noise along a few directions and keeping only its zero crossings.
export fn onyxScratches(position: vec3f) -> f32 {
  var s = 0.0;
  let dirs = array<vec3f, 3>(
    normalize(vec3f(1.0, 0.3, 0.2)),
    normalize(vec3f(-0.4, 1.0, 0.5)),
    normalize(vec3f(0.3, -0.2, 1.0)),
  );
  for (var i = 0; i < 3; i = i + 1) {
    let d = dirs[i];
    // Compress along d, so noise turns into long streaks across it.
    let along = dot(position, d);
    let across = position - d * along;
    let n = simplex3d(across * 22.0 + vec3f(along * 0.8, f32(i) * 13.0, 0.0));
    let line = 1.0 - smoothstep(0.0, 0.035, abs(n));
    // Sparse: only some regions have scratches in each direction.
    let gate = smoothstep(0.35, 0.75, simplex3d(position * 1.3 + vec3f(f32(i) * 4.7)) * 0.5 + 0.5);
    s = max(s, line * gate);
  }
  return s;
}

// Surface height for bump mapping: gentle undulation of the polish plus
// fine pitting. Returns roughly -1..1.
export fn onyxHeight(position: vec3f) -> f32 {
  let undulate = fbmSimplex3d(position * 1.1, 3, 2.0, 0.5);
  let ripple = simplex3d(position * 6.0) * 0.12;
  return undulate * 0.8 + ripple;
}

// Low-frequency cloudiness inside the stone. Returns 0..1.
export fn crystalMist(position: vec3f, timeSeconds: f32) -> f32 {
  let n = fbmSimplex3d(position * 0.7 + vec3f(timeSeconds * 0.05, 0.0, 0.0), 4, 2.0, 0.5);
  return clamp(n * 0.5 + 0.5, 0.0, 1.0);
}

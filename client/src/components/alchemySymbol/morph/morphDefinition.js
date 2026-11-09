import { support } from './halfspace.js';

export const MORPH_TOLERANCE = 1e-5;
export const MAX_MORPH_PLANES = 64;

export function morphProgress(t) {
  const ease = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
  return { cut: ease(t / 0.6), release: ease((t - 0.4) / 0.6) };
}

/** Normals stay fixed; plane offsets are affine in the two easing scalars. */
export function createMorphDefinition(A, B) {
  const planes = [
    ...A.planes.map((p) => ({ n: p.n, base: p.d, release: Math.max(p.d, support(B.vertices, p.n)) * 1.0005 - p.d, cut: 0 })),
    ...B.planes.map((p) => {
      const base = Math.max(p.d, support(A.vertices, p.n)) * 1.0005;
      return { n: p.n, base, release: 0, cut: p.d - base };
    }),
  ];
  if (planes.length > MAX_MORPH_PLANES) throw new RangeError('Morph exceeds the compiled plane budget.');
  return planes;
}

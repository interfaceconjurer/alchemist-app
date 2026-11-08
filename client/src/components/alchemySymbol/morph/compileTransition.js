// Build-time only: the animation imports the evaluator and generated tables.
import { createMorphDefinition, MORPH_TOLERANCE } from './morphDefinition.js';

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/**
 * A candidate vertex is x0 + release*xRelease + cut*xCut. Eliminate it only
 * when a plane excludes it everywhere in the full [0,1]^2 easing square.
 * This conservative superset includes every point on the actual easing path;
 * no progress sampling, geometry quantization, or approximate frame cache.
 */
export function compileMorphTransition(A, B) {
  const planes = createMorphDefinition(A, B);
  const candidates = [];
  for (let a = 0; a < planes.length; a++) {
    for (let b = a + 1; b < planes.length; b++) {
      for (let c = b + 1; c < planes.length; c++) {
        const qr = cross(planes[b].n, planes[c].n);
        const det = dot(planes[a].n, qr);
        if (Math.abs(det) < 1e-9) continue;
        const rp = cross(planes[c].n, planes[a].n);
        const pq = cross(planes[a].n, planes[b].n);
        const inverse = 1 / det;
        const solve = (field) => [0, 1, 2].map((k) =>
          (planes[a][field] * qr[k] + planes[b][field] * rp[k] + planes[c][field] * pq[k]) * inverse);
        const base = solve('base'), release = solve('release'), cut = solve('cut');
        const possible = planes.every((p) => {
          const r0 = dot(p.n, base) - p.base;
          const rr = dot(p.n, release) - p.release;
          const rc = dot(p.n, cut) - p.cut;
          // Preserve uncertain near-parallel candidates rather than pruning on
          // floating point cancellation. Runtime still checks every constraint.
          const margin = 1e-9 * (1 + Math.abs(r0) + Math.abs(rr) + Math.abs(rc));
          return r0 + Math.min(0, rr) + Math.min(0, rc) <= MORPH_TOLERANCE + margin;
        });
        if (possible) candidates.push([...base, ...release, ...cut, a, b, c]);
      }
    }
  }
  return { planeCount: planes.length, candidates };
}

export function encodeMorphTables(plans) {
  const dictionary = [], indices = new Map();
  const index = (number) => {
    if (indices.has(number)) return indices.get(number);
    if (dictionary.length >= 65536 || !Number.isFinite(number)) throw new RangeError('Compiled coefficient dictionary exceeds its format budget.');
    const next = dictionary.length;
    indices.set(number, next);
    dictionary.push(number);
    return next;
  };
  const indexed = plans.map((plan) => ({ ...plan, candidates: plan.candidates.map((candidate) =>
    candidate.map((number, i) => i < 9 ? index(number) : number)) }));
  const headerBytes = 16 + plans.length * 6;
  const bytes = new Uint8Array(headerBytes + dictionary.length * 8 + plans.reduce((sum, plan) => sum + plan.candidates.length * 21, 0));
  const view = new DataView(bytes.buffer);
  bytes.set([67, 77, 84, 66, 76, 48, 48, 49]); // CMTBL001
  view.setUint32(8, plans.length, true);
  view.setUint32(12, dictionary.length, true);
  let offset = 16;
  for (const plan of plans) {
    view.setUint16(offset, plan.planeCount, true);
    view.setUint32(offset + 2, plan.candidates.length, true);
    offset += 6;
  }
  for (const number of dictionary) { view.setFloat64(offset, number, true); offset += 8; }
  for (const plan of indexed) {
    for (const candidate of plan.candidates) {
      for (let i = 0; i < 9; i++) { view.setUint16(offset, candidate[i], true); offset += 2; }
      for (let i = 9; i < 12; i++) bytes[offset++] = candidate[i];
    }
  }
  return bytes;
}

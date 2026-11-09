import { createMorphDefinition, morphProgress, MORPH_TOLERANCE, MAX_MORPH_PLANES } from './morphDefinition.js';

const MAGIC = [67, 77, 84, 66, 76, 48, 48, 49]; // CMTBL001
const MERGE_EPS = 2e-3;
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];

/** Decode bounded lossless Float64 tables; reject truncation and invalid indices before use. */
export function decodeMorphTables(source) {
  const view = source instanceof ArrayBuffer ? new DataView(source)
    : new DataView(source.buffer, source.byteOffset, source.byteLength);
  const invalid = () => { throw new Error('Invalid compiled morph tables. Regenerate the artifact.'); };
  if (view.byteLength < 16 || view.byteLength > 2_000_000 || MAGIC.some((byte, i) => view.getUint8(i) !== byte)) invalid();
  const count = view.getUint32(8, true), dictionaryLength = view.getUint32(12, true);
  if (count < 1 || count > 8 || dictionaryLength > 65536 || view.byteLength < 16 + count * 6) invalid();
  let offset = 16;
  const metadata = [];
  let expectedBytes = 16 + count * 6 + dictionaryLength * 8;
  for (let i = 0; i < count; i++) {
    const planeCount = view.getUint16(offset, true), candidateCount = view.getUint32(offset + 2, true);
    if (planeCount < 4 || planeCount > MAX_MORPH_PLANES || candidateCount > planeCount * (planeCount - 1) * (planeCount - 2) / 6) invalid();
    metadata.push({ planeCount, candidateCount });
    expectedBytes += candidateCount * 21;
    offset += 6;
  }
  if (expectedBytes !== view.byteLength) invalid();
  const dictionary = new Float64Array(dictionaryLength);
  for (let i = 0; i < dictionary.length; i++) {
    dictionary[i] = view.getFloat64(offset, true);
    if (!Number.isFinite(dictionary[i])) invalid();
    offset += 8;
  }
  return metadata.map(({ planeCount, candidateCount }) => {
    const coefficients = new Float64Array(candidateCount * 9);
    const triples = new Uint8Array(candidateCount * 3);
    for (let candidate = 0; candidate < candidateCount; candidate++) {
      for (let k = 0; k < 9; k++) {
        const index = view.getUint16(offset, true);
        if (index >= dictionary.length) invalid();
        coefficients[candidate * 9 + k] = dictionary[index];
        offset += 2;
      }
      for (let k = 0; k < 3; k++) {
        const index = view.getUint8(offset++);
        if (index >= planeCount) invalid();
        triples[candidate * 3 + k] = index;
      }
    }
    return { planeCount, candidateCount, coefficients, triples };
  });
}

/**
 * Evaluate exact continuous morphs using a generated, conservatively pruned
 * candidate table. The retained scratch state is O(planes + candidates), with
 * fresh small result topology owned by each caller. There is no frame cache.
 */
export function createCompiledMorph(A, B, table) {
  const planes = createMorphDefinition(A, B);
  if (planes.length !== table.planeCount) throw new Error('Compiled morph plane count does not match the current solids.');
  const offsets = new Float64Array(planes.length);
  const bases = planes.map(({ n }) => {
    const helper = Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    const tangent = cross(n, helper);
    const u = scale(tangent, 1 / Math.hypot(...tangent));
    return [u, cross(n, u)];
  });
  const { coefficients: values, triples, candidateCount } = table;
  return {
    candidateCount,
    at(t) {
      if (!Number.isFinite(t)) throw new RangeError('Morph progress must be finite.');
      const { cut, release } = morphProgress(t);
      for (let i = 0; i < planes.length; i++) offsets[i] = planes[i].base + planes[i].release * release + planes[i].cut * cut;
      const vertices = [], vertexPlanes = [];
      for (let candidate = 0; candidate < candidateCount; candidate++) {
        const k = candidate * 9;
        const x = values[k] + values[k + 3] * release + values[k + 6] * cut;
        const y = values[k + 1] + values[k + 4] * release + values[k + 7] * cut;
        const z = values[k + 2] + values[k + 5] * release + values[k + 8] * cut;
        let inside = true;
        for (let i = 0; i < planes.length; i++) {
          const n = planes[i].n;
          if (n[0] * x + n[1] * y + n[2] * z > offsets[i] + MORPH_TOLERANCE) { inside = false; break; }
        }
        if (!inside) continue;
        let index = 0;
        for (; index < vertices.length; index++) {
          const v = vertices[index];
          if (Math.hypot(v[0] - x, v[1] - y, v[2] - z) < MERGE_EPS) break;
        }
        if (index === vertices.length) { vertices.push([x, y, z]); vertexPlanes.push(new Set()); }
        const row = candidate * 3;
        vertexPlanes[index].add(triples[row]).add(triples[row + 1]).add(triples[row + 2]);
      }
      vertices.forEach((v, vi) => {
        planes.forEach((p, pi) => { if (Math.abs(dot(p.n, v) - offsets[pi]) < MORPH_TOLERANCE * 10) vertexPlanes[vi].add(pi); });
      });
      const faces = [];
      planes.forEach((p, pi) => {
        const indices = [];
        vertexPlanes.forEach((set, vi) => { if (set.has(pi)) indices.push(vi); });
        if (indices.length < 3) return;
        const centroid = scale(indices.reduce((acc, vi) => [acc[0] + vertices[vi][0], acc[1] + vertices[vi][1], acc[2] + vertices[vi][2]], [0, 0, 0]), 1 / indices.length);
        const [u, w] = bases[pi];
        indices.sort((i, j) => {
          const di = sub(vertices[i], centroid), dj = sub(vertices[j], centroid);
          return Math.atan2(dot(di, w), dot(di, u)) - Math.atan2(dot(dj, w), dot(dj, u));
        });
        const area = indices.reduce((acc, vi, k) => {
          const a = sub(vertices[vi], centroid), b = sub(vertices[indices[(k + 1) % indices.length]], centroid);
          return acc + dot(cross(a, b), p.n);
        }, 0) * 0.5;
        if (area >= 1e-6) faces.push({ normal: p.n, plane: pi, indices });
      });
      const edgeKeys = new Set(), edges = [];
      faces.forEach(({ indices }) => {
        indices.forEach((vi, k) => {
          const vj = indices[(k + 1) % indices.length];
          const key = vi < vj ? `${vi}-${vj}` : `${vj}-${vi}`;
          if (!edgeKeys.has(key)) { edgeKeys.add(key); edges.push([vi, vj]); }
        });
      });
      return { vertices, faces, edges };
    },
  };
}

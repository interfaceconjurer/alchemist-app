import { readFileSync } from 'node:fs';
import { deepStrictEqual } from 'node:assert/strict';
import { describe, expect, it } from 'vitest';
import { SEQUENCE } from './solids.js';
import { intersectHalfspaces, morphPlanes } from './halfspace.js';
import { compileMorphTransition, encodeMorphTables } from './compileTransition.js';
import { createCompiledMorph, decodeMorphTables } from './compiledMorph.js';

const artifact = readFileSync('src/components/alchemySymbol/morph/morph-transitions.bin');
const tables = decodeMorphTables(artifact);
// atan2 may choose the opposite side of its +/-pi branch cut after harmless
// rounding changes. A cyclic rotation keeps the same polygon and winding.
const canonicalFace = (face) => {
  const first = face.indices.indexOf(Math.min(...face.indices));
  return { ...face, indices: [...face.indices.slice(first), ...face.indices.slice(0, first)] };
};
const canonicalEdges = (edges) => edges.map(([a, b]) => a < b ? `${a}:${b}` : `${b}:${a}`).sort();
const critical = [-1, 0, 1e-8, 1e-5, 0.4 - 1e-8, 0.4, 0.4 + 1e-8, 0.6 - 1e-8, 0.6, 0.6 + 1e-8, 1 - 1e-8, 1, 2];
const progress = [...critical, ...Array.from({ length: 169 }, (_, i) => i / 168),
  ...Array.from({ length: 64 }, (_, i) => ((i * 2654435761) >>> 0) / 2 ** 32)];

describe('compiled morph geometry', () => {
  it('the generated artifact exactly matches the current source solids and compiler', () => {
    const plans = SEQUENCE.map((A, i) => compileMorphTransition(A, SEQUENCE[(i + 1) % SEQUENCE.length]));
    expect(Buffer.from(encodeMorphTables(plans)).equals(artifact)).toBe(true);
    expect(tables).toHaveLength(SEQUENCE.length);
    expect(tables.reduce((bytes, table) => bytes + table.coefficients.byteLength + table.triples.byteLength, 0)).toBeLessThan(256 * 1024);
  });

  for (let i = 0; i < SEQUENCE.length; i++) {
    const A = SEQUENCE[i], B = SEQUENCE[(i + 1) % SEQUENCE.length];
    it(`${A.name} to ${B.name} preserves continuous geometry, face winding, and topology`, () => {
      const compiled = createCompiledMorph(A, B, tables[i]);
      let maximumError = 0;
      for (const t of progress) {
        const expected = intersectHalfspaces(morphPlanes(A, B, t));
        const actual = compiled.at(t);
        const context = `${A.name} to ${B.name} at ${t}`;
        deepStrictEqual(actual.vertices.length, expected.vertices.length, context);
        deepStrictEqual(actual.faces.map(canonicalFace), expected.faces.map(canonicalFace), context);
        deepStrictEqual(canonicalEdges(actual.edges), canonicalEdges(expected.edges), context);
        for (let v = 0; v < expected.vertices.length; v++) {
          for (let c = 0; c < 3; c++) maximumError = Math.max(maximumError, Math.abs(actual.vertices[v][c] - expected.vertices[v][c]));
        }
      }
      expect(maximumError).toBeLessThan(1e-10);
    }, 15_000);
  }

  it('rejects mismatched source dimensions and non-finite progress', () => {
    expect(() => createCompiledMorph(SEQUENCE[0], SEQUENCE[1], tables[4])).toThrow(/plane count/);
    expect(() => createCompiledMorph(SEQUENCE[0], SEQUENCE[1], tables[0]).at(NaN)).toThrow(/finite/);
    expect(() => compileMorphTransition({ planes: Array(65).fill({ n: [1, 0, 0], d: 1 }), vertices: [] }, SEQUENCE[0])).toThrow(/plane budget/);
  });
});

describe('compiled morph data boundary', () => {
  const mutated = (change) => { const bytes = new Uint8Array(artifact); change(new DataView(bytes.buffer), bytes); return bytes; };
  it('rejects unsupported formats, truncated or trailing data, and oversized metadata', () => {
    expect(() => decodeMorphTables(mutated((view) => view.setUint8(7, 99)))).toThrow(/Invalid/);
    expect(() => decodeMorphTables(artifact.subarray(0, 15))).toThrow(/Invalid/);
    expect(() => decodeMorphTables(artifact.subarray(0, artifact.length - 1))).toThrow(/Invalid/);
    expect(() => decodeMorphTables(new Uint8Array(artifact.length + 1))).toThrow(/Invalid/);
    expect(() => decodeMorphTables(mutated((view) => view.setUint32(8, 999, true)))).toThrow(/Invalid/);
    expect(() => decodeMorphTables(mutated((view) => view.setUint32(12, 999999, true)))).toThrow(/Invalid/);
  });
  it('rejects non-finite coefficients and out-of-range dictionary/plane indices', () => {
    const header = new DataView(artifact.buffer, artifact.byteOffset, artifact.byteLength);
    const dictionaryStart = 16 + header.getUint32(8, true) * 6;
    const dictionaryLength = header.getUint32(12, true);
    const candidateStart = dictionaryStart + dictionaryLength * 8;
    expect(() => decodeMorphTables(mutated((view) => view.setFloat64(dictionaryStart, NaN, true)))).toThrow(/Invalid/);
    expect(() => decodeMorphTables(mutated((view) => view.setUint16(candidateStart, dictionaryLength, true)))).toThrow(/Invalid/);
    expect(() => decodeMorphTables(mutated((view) => view.setUint8(candidateStart + 18, 255)))).toThrow(/Invalid/);
  });
});

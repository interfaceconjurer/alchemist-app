import { readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { performance } from 'node:perf_hooks';
import { SEQUENCE } from './solids.js';
import { intersectHalfspaces, morphPlanes } from './halfspace.js';
import { decodeMorphTables, createCompiledMorph } from './compiledMorph.js';

// Desktop CPU math microbenchmark, excluding buffer uploads and GPU rendering.
// Keep before/after samples interleaved so GC/clock changes affect both paths.
const bytes = await readFile(new URL('./morph-transitions.bin', import.meta.url));
let started = performance.now();
const tables = decodeMorphTables(bytes);
const decodeMs = performance.now() - started;
started = performance.now();
const morphs = SEQUENCE.map((A, i) => createCompiledMorph(A, SEQUENCE[(i + 1) % SEQUENCE.length], tables[i]));
const prepareMs = performance.now() - started;
const percentile = (samples, p) => [...samples].sort((a, b) => a - b)[Math.floor((samples.length - 1) * p)];
const transitions = [];
for (let i = 0; i < SEQUENCE.length; i++) {
  const A = SEQUENCE[i], B = SEQUENCE[(i + 1) % SEQUENCE.length], compiled = morphs[i];
  for (let k = 0; k < 168; k++) { intersectHalfspaces(morphPlanes(A, B, k / 167)); compiled.at(k / 167); }
  const referenceTimes = [], compiledTimes = [];
  for (let loop = 0; loop < 3; loop++) {
    for (let k = 0; k < 168; k++) {
      const t = k / 167;
      started = performance.now();
      intersectHalfspaces(morphPlanes(A, B, t));
      referenceTimes.push(performance.now() - started);
      started = performance.now();
      compiled.at(t);
      compiledTimes.push(performance.now() - started);
    }
  }
  transitions.push({
    transition: `${A.name} -> ${B.name}`, candidates: compiled.candidateCount,
    referenceP50Ms: percentile(referenceTimes, 0.5), referenceP95Ms: percentile(referenceTimes, 0.95),
    compiledP50Ms: percentile(compiledTimes, 0.5), compiledP95Ms: percentile(compiledTimes, 0.95),
  });
}
console.log(JSON.stringify({
  runtime: process.version, samplesPerTransition: 504,
  artifactBytes: bytes.length, artifactGzipBytes: gzipSync(bytes).length,
  expandedBytes: tables.reduce((sum, table) => sum + table.coefficients.byteLength + table.triples.byteLength, 0),
  decodeMs, prepareMs, transitions,
}, null, 2));

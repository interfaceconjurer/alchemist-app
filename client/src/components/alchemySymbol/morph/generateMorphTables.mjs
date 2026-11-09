import { readFile, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { compileMorphTransition, encodeMorphTables } from './compileTransition.js';
import { SEQUENCE } from './solids.js';

const artifact = new URL('./morph-transitions.bin', import.meta.url);
const plans = SEQUENCE.map((A, i) => compileMorphTransition(A, SEQUENCE[(i + 1) % SEQUENCE.length]));
const bytes = encodeMorphTables(plans);
if (process.argv.includes('--check')) {
  const existing = await readFile(artifact);
  if (!existing.equals(Buffer.from(bytes))) {
    console.error('Compiled morph tables are stale. Run node src/components/alchemySymbol/morph/generateMorphTables.mjs and review the changed artifact.');
    process.exit(1);
  }
} else {
  await writeFile(artifact, bytes);
}
console.log(JSON.stringify({ artifact: 'morph-transitions.bin', bytes: bytes.byteLength, gzipBytes: gzipSync(bytes).byteLength, candidates: plans.map((plan) => plan.candidates.length) }));

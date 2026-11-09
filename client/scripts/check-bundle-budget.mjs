import { readdir, readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';

// Growth limits based on the reviewed production build. These are payload
// regression gates including binary geometry assets; frame-time compliance still needs supported-device traces.
const limits = {
  entryGzip: 105_000,
  runtimeGzip: 580_000,
  runtimeRaw: 2_100_000,
  stylesheetRaw: 35_000,
};
const assets = new URL('../dist/assets/', import.meta.url);
let names;
try {
  names = await readdir(assets);
} catch {
  console.error('Build output is missing. Run npm run build before npm run check:bundle.');
  process.exit(1);
}
// Include entry preload dependencies as well as the entry itself. A shared
// chunk must not disappear from the initial-payload limit after code splitting.
const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
const entryAssets = new Set([...html.matchAll(/(?:src|href)="\/assets\/([^"]+\.js)"/g)].map(match => match[1]));
const totals = { entryGzip: 0, runtimeGzip: 0, runtimeRaw: 0, stylesheetRaw: 0 };
let entryFound = false;
for (const name of names) {
  if (!/\.(js|css|bin)$/.test(name)) continue;
  const bytes = await readFile(new URL(name, assets));
  if (name.endsWith('.js') || name.endsWith('.bin')) {
    const compressed = gzipSync(bytes).length;
    totals.runtimeRaw += bytes.length;
    totals.runtimeGzip += compressed;
    if (entryAssets.has(name)) {
      entryFound = true;
      totals.entryGzip += compressed;
    }
  } else {
    totals.stylesheetRaw += bytes.length;
  }
}
if (!entryFound) {
  console.error('Could not identify the production JavaScript entry; update the budget check for the build layout.');
  process.exit(1);
}
let failed = false;
for (const [name, maximum] of Object.entries(limits)) {
  const actual = totals[name];
  console.log(`${name}: ${actual.toLocaleString('en-US')} / ${maximum.toLocaleString('en-US')} bytes`);
  if (actual > maximum) failed = true;
}
if (failed) {
  console.error('Production bundle exceeded its reviewed budget. Investigate the added payload before changing the limit.');
  process.exitCode = 1;
}

import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { validSlug } from '../src/sketchPath.js';
import { updateSketchMetadata } from '../src/sketchMetadata.js';

const dist = new URL('../dist/', import.meta.url);
const projects = new URL('../src/data/projects/', import.meta.url);
const shell = await readFile(new URL('index.html', dist), 'utf8');
const slugs = new Set();
for (const name of await readdir(projects)) {
  if (!name.endsWith('.json')) continue;
  const item = JSON.parse(await readFile(new URL(name, projects), 'utf8'));
  if (!validSlug(item.slug) || slugs.has(item.slug)) throw new Error(`Invalid or duplicate sketch slug in ${name}`);
  slugs.add(item.slug);
  const dom = new JSDOM(shell);
  updateSketchMetadata(dom.window.document, item);
  const directory = new URL(`sketch/${item.slug}/`, dist);
  await mkdir(directory, { recursive: true });
  await writeFile(new URL('index.html', directory), dom.serialize());
  dom.window.close();
}

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { updateSketchMetadata } from './sketchMetadata';

// The same function writes each sketch's built HTML (scripts/build-sketch-pages.mjs)
// and updates the live page as sketches open and close.
const home = () => new DOMParser().parseFromString(readFileSync(resolve(process.cwd(), 'index.html'), 'utf8'), 'text/html');
const content = (doc, selector) => doc.querySelector(selector).getAttribute('content');
const pytone = { title: 'PyTone', slug: 'pytone', description: 'Any image, rebuilt from glyphs. Terminal, HTML or SVG.' };

it('gives a sketch a short preview title, its own description and address, and the full title in the tab', () => {
  const doc = home();
  updateSketchMetadata(doc, pytone);
  expect(content(doc, 'meta[property="og:title"]')).toBe('PyTone');
  expect(content(doc, 'meta[name="twitter:title"]')).toBe('PyTone');
  expect(doc.title).toBe('PyTone · Jordan L. Wright · AI Native Designer & Engineer');
  expect(content(doc, 'meta[property="og:description"]')).toBe(pytone.description);
  expect(content(doc, 'meta[property="og:url"]')).toBe('https://jordanwright.codes/sketch/pytone');
  // One shared preview image, unchanged per sketch.
  expect([...doc.querySelectorAll('meta[property="og:image"]')]).toHaveLength(1);
});

it('restores the home preview when a sketch closes', () => {
  const doc = home();
  const before = { og: content(doc, 'meta[property="og:title"]'), title: doc.title, url: content(doc, 'meta[property="og:url"]') };
  updateSketchMetadata(doc, pytone);
  updateSketchMetadata(doc, null);
  expect(content(doc, 'meta[property="og:title"]')).toBe(before.og);
  expect(content(doc, 'meta[name="twitter:title"]')).toBe(before.og);
  expect(doc.title).toBe(before.title);
  expect(content(doc, 'meta[property="og:url"]')).toBe(before.url);
});

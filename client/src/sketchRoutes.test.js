import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { itemForPath, pathFor } from './sketchRoutes';
import { workSections } from './components/workList/workList';

const items = workSections.flatMap((section) => section.items);

it('keeps published addresses when a title changes language or spelling', () => {
  for (const item of items) {
    expect(pathFor({ ...item, title: '新しい名前' })).toBe(pathFor(item));
    expect(item.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  }
});

it('gives every work item its own /sketch/ address', () => {
  const paths = items.map(pathFor);
  expect(new Set(paths).size).toBe(items.length);
  for (const path of paths) expect(path).toMatch(/^\/sketch\/[a-z0-9]+(-[a-z0-9]+)*$/);
  expect(pathFor(null)).toBe('/');
});

it('finds the item an address points to, forgiving case and a trailing slash', () => {
  for (const item of items) {
    expect(itemForPath(pathFor(item))).toBe(item);
    expect(itemForPath(`${pathFor(item).toUpperCase().replace('/SKETCH/', '/sketch/')}/`)).toBe(item);
  }
  expect(itemForPath('/')).toBeUndefined();
  expect(itemForPath('/work/apollo-portfolio-review/index.html')).toBeUndefined();
  expect(itemForPath('/sketch/no-such-thing')).toBeNull();
  expect(itemForPath('/sketch/%E0%A4%A')).toBeNull(); // malformed escape
});

it('lists home and every sketch in the sitemap, and nothing else', () => {
  const xml = readFileSync(resolve(process.cwd(), 'public/sitemap.xml'), 'utf8');
  const listed = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).sort();
  const expected = ['/', ...items.map(pathFor)].map((path) => `https://jordanwright.codes${path}`).sort();
  expect(listed).toEqual(expected);
});

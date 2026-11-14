import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Guards the link-preview / SEO metadata in index.html and the public files it points to.
// Paths are relative to the client directory, where vitest runs.
const file = (path) => resolve(process.cwd(), path);
const html = readFileSync(file('index.html'), 'utf8');
const doc = new DOMParser().parseFromString(html, 'text/html');
const meta = (selector) => doc.querySelector(selector)?.getAttribute('content');
const ORIGIN = 'https://jordanwright.codes';

describe('site metadata', () => {
  it('has a title and a description that fits search results', () => {
    expect(doc.title).toBe('Jordan L. Wright · AI Native Designer & Engineer');
    const description = meta('meta[name="description"]');
    expect(description.length).toBeLessThanOrEqual(160);
    expect(meta('meta[property="og:description"]')).toBe(description);
    expect(meta('meta[name="twitter:description"]')).toBe(description);
  });

  it('points canonical, Open Graph and Twitter at the jordanwright.codes origin', () => {
    expect(doc.querySelector('link[rel="canonical"]').getAttribute('href')).toBe(`${ORIGIN}/`);
    expect(meta('meta[property="og:url"]')).toBe(`${ORIGIN}/`);
    expect(meta('meta[property="og:image"]')).toBe(`${ORIGIN}/og-image-square.png`);
    expect(meta('meta[name="twitter:image"]')).toBe(`${ORIGIN}/og-image.png`);
    expect(meta('meta[name="twitter:card"]')).toBe('summary_large_image');
    expect(meta('meta[property="og:image:alt"]')).toBeTruthy();
  });

  it('ships a 1200x630 preview image and a 180px touch icon', () => {
    const size = (name) => {
      const png = readFileSync(file(`public/${name}`));
      return [png.readUInt32BE(16), png.readUInt32BE(20)];
    };
    expect(size('og-image.png')).toEqual([1200, 630]);
    expect(size('og-image-square.png')).toEqual([630, 630]);
    // The square crystal comes first: Slack shows the first og:image as a square
    // thumbnail. X keeps the wide card through twitter:image.
    expect([...doc.querySelectorAll('meta[property="og:image"]')].map((m) => m.getAttribute('content')))
      .toEqual([`${ORIGIN}/og-image-square.png`, `${ORIGIN}/og-image.png`]);
    expect(size('apple-touch-icon.png')).toEqual([180, 180]);
    expect(meta('meta[property="og:image:width"]')).toBe('630'); // first image's size
    expect(meta('meta[property="og:image:height"]')).toBe('630');
    expect(meta('meta[name="twitter:image"]')).toBe(`${ORIGIN}/og-image.png`);
  });

  it('has valid Person structured data and no old branding', () => {
    const ld = JSON.parse(doc.querySelector('script[type="application/ld+json"]').textContent);
    expect(ld['@type']).toBe('Person');
    expect(ld.url).toBe(`${ORIGIN}/`);
    const manifest = JSON.parse(readFileSync(file('public/manifest.json'), 'utf8'));
    expect(manifest.name).toBe('Jordan L. Wright');
    expect(`${html} ${JSON.stringify(manifest)}`).not.toMatch(/digit\.?\s?al\.?chemist|Digit Alchemist/i);
  });

  it('lets crawlers find the sitemap and keeps the embedded deck out of search', () => {
    expect(readFileSync(file('public/robots.txt'), 'utf8')).toContain(`Sitemap: ${ORIGIN}/sitemap.xml`);
    expect(readFileSync(file('public/sitemap.xml'), 'utf8')).toContain(`<loc>${ORIGIN}/</loc>`);
    expect(readFileSync(file('public/work/apollo-portfolio-review/index.html'), 'utf8')).toContain('<meta name="robots" content="noindex">');
  });
});

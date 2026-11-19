import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Guards the link-preview / SEO metadata in index.html and the public files it points to.
// Paths are relative to the client directory, where vitest runs.
const file = (path) => resolve(process.cwd(), path);
const html = readFileSync(file('index.html'), 'utf8');
const doc = new DOMParser().parseFromString(html, 'text/html');
const meta = (selector) => doc.querySelector(selector)?.getAttribute('content');
const manifest = JSON.parse(readFileSync(file('public/manifest.json'), 'utf8'));
const ORIGIN = 'https://jordanwright.codes';

describe('site metadata', () => {
  it('uses the homepage title and exact description across preview metadata and the manifest', () => {
    expect(doc.title).toBe('Jordan L. Wright · AI Native Designer & Engineer');
    const description = meta('meta[name="description"]');
    expect(description).toBe(
      'Poised at the intersection between science and art, Jordan L. Wright is an AI native designer and engineer. ' +
      'This brief crosssection of work contains some small moments captured in the lab.'
    );
    expect(manifest.description).toBe(description);
    expect(meta('meta[property="og:description"]')).toBe(description);
    expect(meta('meta[name="twitter:description"]')).toBe(description);
  });

  it('points canonical, Open Graph and Twitter at the jordanwright.codes origin', () => {
    expect(doc.querySelector('link[rel="canonical"]').getAttribute('href')).toBe(`${ORIGIN}/`);
    expect(meta('meta[property="og:url"]')).toBe(`${ORIGIN}/`);
    expect(meta('meta[property="og:image"]')).toBe(`${ORIGIN}/og-preview.png`);
    expect(meta('meta[name="twitter:image"]')).toBe(`${ORIGIN}/og-preview.png`);
    expect(meta('meta[name="twitter:card"]')).toBe('summary_large_image');
    expect(meta('meta[property="og:image:alt"]')).toBeTruthy();
  });

  it('ships exactly one 1200x630 preview image and a 180px touch icon', () => {
    const size = (name) => {
      const png = readFileSync(file(`public/${name}`));
      return [png.readUInt32BE(16), png.readUInt32BE(20)];
    };
    // One image: Messages tiles every og:image side by side and crops each one.
    expect([...doc.querySelectorAll('meta[property="og:image"]')].map((m) => m.getAttribute('content')))
      .toEqual([`${ORIGIN}/og-preview.png`]);
    expect(size('og-preview.png')).toEqual([1200, 630]); // LinkedIn's 1.91:1; Apple asks for >= 900 wide
    expect(meta('meta[property="og:image:width"]')).toBe('1200');
    expect(meta('meta[property="og:image:height"]')).toBe('630');
    expect(readFileSync(file('public/og-preview.png')).length).toBeLessThan(1024 * 1024); // well under every app's limit
    expect(size('apple-touch-icon.png')).toEqual([180, 180]);
  });

  it('keeps the name in the home preview title, since most apps show only the title and domain', () => {
    // iMessage, LinkedIn and X ignore og:site_name, so a bare title would drop the name.
    expect(meta('meta[property="og:title"]')).toBe('Jordan L. Wright · AI Native Designer & Engineer');
    expect(meta('meta[name="twitter:title"]')).toBe('Jordan L. Wright · AI Native Designer & Engineer');
    expect(meta('meta[property="og:site_name"]')).toBe('Jordan L. Wright');
    expect(doc.title).toBe('Jordan L. Wright · AI Native Designer & Engineer');
  });

  it('has valid Person structured data and no old branding', () => {
    const ld = JSON.parse(doc.querySelector('script[type="application/ld+json"]').textContent);
    expect(ld['@type']).toBe('Person');
    expect(ld.url).toBe(`${ORIGIN}/`);
    expect(manifest.name).toBe('Jordan L. Wright');
    expect(`${html} ${JSON.stringify(manifest)}`).not.toMatch(/digit\.?\s?al\.?chemist|Digit Alchemist/i);
  });

  it('lets crawlers find the sitemap and keeps the embedded deck out of search', () => {
    expect(readFileSync(file('public/robots.txt'), 'utf8')).toContain(`Sitemap: ${ORIGIN}/sitemap.xml`);
    expect(readFileSync(file('public/sitemap.xml'), 'utf8')).toContain(`<loc>${ORIGIN}/</loc>`);
    expect(readFileSync(file('public/work/apollo-portfolio-review/index.html'), 'utf8')).toContain('<meta name="robots" content="noindex">');
  });
});

import { describe, expect, it } from 'vitest';
import { generateStars, LAYERS, mulberry32 } from './spaceField';

const box = { width: 1440 + 96, height: 900 + 96 };

describe('space field', () => {
  it('is deterministic: the same seed draws the same sky on every load', () => {
    const a = generateStars({ ...box, ...LAYERS.dark.far });
    const b = generateStars({ ...box, ...LAYERS.dark.far });
    expect(a).toEqual(b);
    expect(mulberry32(7)()).toBe(mulberry32(7)());
  });

  it('scales star count with area at the layer density', () => {
    const stars = generateStars({ ...box, ...LAYERS.dark.far });
    expect(stars.length).toBe(Math.round((box.width * box.height) / 1e4 * LAYERS.dark.far.density));
    const half = generateStars({ width: box.width / 2, height: box.height, ...LAYERS.dark.far });
    expect(half.length / stars.length).toBeCloseTo(0.5, 1);
  });

  it('keeps the sky faint: most stars are dim and only a few have halos', () => {
    const stars = generateStars({ ...box, ...LAYERS.dark.far });
    const dim = stars.filter((s) => s.a < LAYERS.dark.far.brightness * 0.4).length;
    expect(dim / stars.length).toBeGreaterThan(0.6);
    expect(stars.filter((s) => s.glow).length / stars.length).toBeLessThan(0.08);
    for (const s of stars) {
      expect(s.a).toBeLessThanOrEqual(LAYERS.dark.far.brightness);
      expect(s.r).toBeGreaterThanOrEqual(LAYERS.dark.far.sizeRange[0]);
      expect(s.r).toBeLessThanOrEqual(LAYERS.dark.far.sizeRange[1]);
    }
  });

  it('keeps every star inside the oversized layer box', () => {
    for (const s of generateStars({ ...box, ...LAYERS.dark.near })) {
      expect(s.x).toBeGreaterThanOrEqual(0);
      expect(s.x).toBeLessThanOrEqual(box.width);
      expect(s.y).toBeGreaterThanOrEqual(0);
      expect(s.y).toBeLessThanOrEqual(box.height);
    }
  });

  it('light mode is the inverse: the same sky in dark ink', () => {
    const dark = generateStars({ ...box, ...LAYERS.dark.far, mode: 'dark' });
    const light = generateStars({ ...box, ...LAYERS.light.far, mode: 'light' });
    const lum = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
    expect(Math.max(...light.map((s) => lum(s.tint)))).toBeLessThan(80);
    expect(Math.min(...dark.map((s) => lum(s.tint)))).toBeGreaterThan(180);
    // Same seed, so the constellations line up across themes.
    expect(light[0].x).toBe(dark[0].x);
    expect(light[0].y).toBe(dark[0].y);
  });
});

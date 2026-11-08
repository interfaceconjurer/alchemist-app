import { describe, expect, it } from 'vitest';
import { generateStars, LAYERS, mulberry32 } from './spaceField';

const box = { width: 1440 + 96, height: 900 + 96 };

describe('space field', () => {
  it('is deterministic: the same seed draws the same sky on every load', () => {
    const a = generateStars({ ...box, ...LAYERS.far });
    const b = generateStars({ ...box, ...LAYERS.far });
    expect(a).toEqual(b);
    expect(mulberry32(7)()).toBe(mulberry32(7)());
  });

  it('scales star count with area at the layer density', () => {
    const stars = generateStars({ ...box, ...LAYERS.far });
    expect(stars.length).toBe(Math.round((box.width * box.height) / 1e4 * LAYERS.far.density));
    const half = generateStars({ width: box.width / 2, height: box.height, ...LAYERS.far });
    expect(half.length / stars.length).toBeCloseTo(0.5, 1);
  });

  it('keeps the sky faint: most stars are dim and only a few have halos', () => {
    const stars = generateStars({ ...box, ...LAYERS.far });
    const dim = stars.filter((s) => s.a < LAYERS.far.brightness * 0.4).length;
    expect(dim / stars.length).toBeGreaterThan(0.6);
    expect(stars.filter((s) => s.glow).length / stars.length).toBeLessThan(0.08);
    for (const s of stars) {
      expect(s.a).toBeLessThanOrEqual(LAYERS.far.brightness);
      expect(s.r).toBeGreaterThanOrEqual(LAYERS.far.sizeRange[0]);
      expect(s.r).toBeLessThanOrEqual(LAYERS.far.sizeRange[1]);
    }
  });

  it('keeps every star inside the oversized layer box', () => {
    for (const s of generateStars({ ...box, ...LAYERS.near })) {
      expect(s.x).toBeGreaterThanOrEqual(0);
      expect(s.x).toBeLessThanOrEqual(box.width);
      expect(s.y).toBeGreaterThanOrEqual(0);
      expect(s.y).toBeLessThanOrEqual(box.height);
    }
  });
});

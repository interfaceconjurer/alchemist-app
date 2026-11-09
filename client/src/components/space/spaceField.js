/**
 * Deep-space backdrop, generated procedurally on a 2D canvas once per size.
 *
 * Why 2D canvas + CSS, not a second WebGPU canvas:
 *  - zero new payload (no images; this module is a few KB) against the tight
 *    runtime bundle budget,
 *  - CSP-clean (no new hosts; output is a blob: URL, already allowed),
 *  - rasterization/encoding run in a worker; CSS transforms/opacity provide
 *    motion. The bounded compositor textures still consume GPU resources.
 *
 * Layers (each its own transparent canvas so CSS can drift them at different
 * rates for parallax): far stars, near stars, nebula.
 */

/** Small, fast, seeded PRNG so the sky is identical on every load. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Same palette as crystal/backlight.js so nebula and backlight read as one light. */
export const NEBULA_PALETTE = [
  [109, 77, 255], // violet  #6d4dff
  [25, 195, 255], // cyan    #19c3ff
  [255, 61, 139], // rose    #ff3d8b
];

// Star colour temperatures. Dark mode: light stars, mostly white with some
// warm and cool. Light mode is the inverse: ink-dark stars on the grey page,
// keeping a hint of warm (umber) and cool (slate-blue) temperature.
const STAR_TINTS = {
  dark: [
    [255, 255, 255], [255, 255, 255], [255, 255, 255],
    [255, 236, 214], [255, 214, 180], // warm
    [214, 228, 255], [190, 210, 255], // cool
  ],
  light: [
    [34, 36, 42], [34, 36, 42], [34, 36, 42],
    [58, 44, 34], [66, 46, 34], // warm
    [30, 38, 58], [26, 34, 62], // cool
  ],
};

/**
 * Stars as plain data (testable without a canvas). Sizes in CSS pixels.
 * Magnitudes follow a steep power law: most stars are barely visible.
 */
export function generateStars({ width, height, density, seed, sizeRange, brightness, mode = 'dark' }) {
  const rand = mulberry32(seed);
  const count = Math.round((width * height) / 1e4 * density);
  const stars = [];
  for (let i = 0; i < count; i++) {
    const m = Math.pow(rand(), 3.2); // 0..1, heavily skewed toward dim
    const tints = STAR_TINTS[mode];
    const tint = tints[Math.floor(rand() * tints.length)];
    stars.push({
      x: rand() * width,
      y: rand() * height,
      r: sizeRange[0] + (sizeRange[1] - sizeRange[0]) * m,
      a: brightness * (0.18 + 0.82 * m),
      tint,
      glow: m > 0.9, // the rare bright ones get a soft halo
    });
  }
  return stars;
}

function drawStars(ctx, stars) {
  for (const s of stars) {
    const [r, g, b] = s.tint;
    if (s.glow) {
      const halo = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 6);
      halo.addColorStop(0, `rgba(${r},${g},${b},${s.a * 0.35})`);
      halo.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = `rgba(${r},${g},${b},${s.a})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Nebula: many large, very soft radial blobs, clustered along a few drifting
 * "filaments" so it reads as gas clouds rather than random spots. Dust lanes
 * are subtracted with destination-out so the clouds have dark structure.
 */
function drawNebula(ctx, { width, height, seed, intensity, mode = 'dark' }) {
  const rand = mulberry32(seed);
  const diag = Math.hypot(width, height);
  // Dark: clouds of light that add up. Light: translucent ink that the page
  // multiplies with (see .space--light in space.css), so it tints and darkens.
  ctx.globalCompositeOperation = mode === 'dark' ? 'lighter' : 'source-over';
  const filaments = 4;
  for (let f = 0; f < filaments; f++) {
    const base = NEBULA_PALETTE[f % NEBULA_PALETTE.length];
    // Light mode: desaturate toward a slate ink so the wash reads as tinted shadow.
    const color = mode === 'dark' ? base : base.map((c) => Math.round(c * 0.45 + 70 * 0.55));
    // A filament is a gently curving path across part of the sky.
    let x = rand() * width, y = rand() * height;
    let angle = rand() * Math.PI * 2;
    const steps = 26;
    for (let i = 0; i < steps; i++) {
      angle += (rand() - 0.5) * 0.7;
      x += Math.cos(angle) * diag * 0.03;
      y += Math.sin(angle) * diag * 0.03;
      const radius = diag * (0.05 + rand() * 0.11);
      const a = intensity * (0.025 + rand() * 0.05);
      const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
      g.addColorStop(0, `rgba(${color[0]},${color[1]},${color[2]},${a})`);
      g.addColorStop(0.55, `rgba(${color[0]},${color[1]},${color[2]},${a * 0.35})`);
      g.addColorStop(1, `rgba(${color[0]},${color[1]},${color[2]},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Dust lanes: carve soft dark gaps through the gas.
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 18; i++) {
    const x = rand() * width, y = rand() * height;
    const radius = diag * (0.03 + rand() * 0.07);
    const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, 'rgba(0,0,0,0.55)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, radius * 1.8, radius * 0.6, rand() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
}

/**
 * Blue-noise-ish ordered dither: breaks up 8-bit banding in the very dark,
 * smooth nebula gradients without visibly adding grain.
 */
function dither(ctx, width, height, seed, amount = 1.6) {
  const image = ctx.getImageData(0, 0, width, height);
  const d = image.data;
  const rand = mulberry32(seed);
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const n = (rand() - 0.5) * amount;
    d[i] = Math.min(255, Math.max(0, d[i] + n));
    d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + n));
    d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + n));
  }
  ctx.putImageData(image, 0, 0);
}

export const LAYERS = {
  dark: {
    far: { density: 16, sizeRange: [0.3, 0.8], brightness: 0.42, seed: 1201 },
    near: { density: 1.4, sizeRange: [0.5, 1.3], brightness: 0.7, seed: 7741 },
    nebula: { seed: 3307, intensity: 0.62 },
  },
  // Dark specks read stronger on grey than light ones on black, so they're fainter.
  light: {
    far: { density: 14, sizeRange: [0.3, 0.75], brightness: 0.36, seed: 1201 },
    near: { density: 1.2, sizeRange: [0.5, 1.2], brightness: 0.58, seed: 7741 },
    nebula: { seed: 3307, intensity: 0.55 },
  },
};

/**
 * Render one layer into a canvas sized for the given CSS box and DPR.
 * Layers are oversized by `bleed` on each side so CSS drift never reveals an edge.
 */
export function renderLayer(kind, { width, height, dpr, bleed, createCanvas, mode = 'dark' }) {
  const layers = LAYERS[mode];
  const w = Math.max(1, Math.floor((width + bleed * 2) * dpr));
  const h = Math.max(1, Math.floor((height + bleed * 2) * dpr));
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  ctx.scale(dpr, dpr);
  const box = { width: width + bleed * 2, height: height + bleed * 2 };
  if (kind === 'nebula') {
    // Draw the soft clouds at quarter resolution, then upscale with a blur
    // filter: bilinear upscaling alone leaves a faint grid in dark gradients.
    const scale = 0.25;
    const small = createCanvas(Math.ceil(box.width * scale), Math.ceil(box.height * scale));
    const sctx = small.getContext('2d');
    if (!sctx) throw new Error('2D canvas unavailable');
    sctx.scale(scale, scale);
    drawNebula(sctx, { ...box, ...layers.nebula, mode });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    if ('filter' in ctx) ctx.filter = `blur(${Math.round(4 / scale)}px)`;
    ctx.drawImage(small, 0, 0, box.width, box.height);
    small.width = 0;
    small.height = 0;
    if ('filter' in ctx) ctx.filter = 'none';
    // Dither at output resolution so the noise is sub-pixel, not a visible grid.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    dither(ctx, canvas.width, canvas.height, layers.nebula.seed + 1, 1.1);
  } else {
    drawStars(ctx, generateStars({ ...box, ...layers[kind], mode }));
  }
  return canvas;
}

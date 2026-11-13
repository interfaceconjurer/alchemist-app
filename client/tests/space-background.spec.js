import { test, expect } from '@playwright/test';
import { openSearch, toggleTheme } from './shell-helpers.js';

// Keep GPU startup out of the backdrop's functional checks. Native combined
// animation profiling separately qualifies generated backdrops and the crystal.
test.use({ reducedMotion: 'reduce', colorScheme: 'dark' });
const errorsByPage = new WeakMap();

test.beforeEach(async ({ page }) => {
  const errors = [];
  errorsByPage.set(page, errors);
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    window.__spacePolicyViolations = [];
    document.addEventListener('securitypolicyviolation', event => {
      window.__spacePolicyViolations.push({ directive: event.violatedDirective, blockedURI: event.blockedURI });
    });
  });
});

test.afterEach(async ({ page }) => {
  expect(errorsByPage.get(page)).toEqual([]);
  expect(await page.evaluate(() => window.__spacePolicyViolations)).toEqual([]);
});

async function inspectBackdrop(page, mode, previous) {
  const space = page.locator('.space');
  await expect(space).toHaveClass(new RegExp(`space--${mode}`));
  await expect(space).toHaveClass(/space--ready/);
  await expect(space).toHaveAttribute('data-space-renderer', /^(worker|fallback)$/);
  await expect(space.locator('.space-layer')).toHaveCount(3);
  if (previous?.renderer === 'worker') {
    const oldBackgrounds = previous.layers.map(layer => layer.background);
    await expect.poll(() => space.locator('.space-layer').evaluateAll(layers => layers.map(layer => getComputedStyle(layer).backgroundImage))).not.toEqual(oldBackgrounds);
  }
  return space.evaluate(async element => {
    const renderer = element.dataset.spaceRenderer;
    const layers = await Promise.all([...element.querySelectorAll('.space-layer')].map(async layer => {
      const background = getComputedStyle(layer).backgroundImage;
      const url = /^url\(["']?(blob:[^"')]+)["']?\)$/.exec(background)?.[1];
      if (renderer !== 'worker') return { background, url: url ?? null };
      if (!url) throw new Error(`Generated backdrop has no blob image: ${background}`);
      const image = new Image();
      image.src = url;
      await image.decode();
      // Alpha-weighted brightness checks that the inverse starfield really
      // changes its image, rather than only changing a theme class.
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 64;
      const context = canvas.getContext('2d');
      context.drawImage(image, 0, 0, 64, 64);
      const pixels = context.getImageData(0, 0, 64, 64).data;
      let luminance = 0, alpha = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        luminance += (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3 * pixels[i + 3];
        alpha += pixels[i + 3];
      }
      return { background, url, width: image.naturalWidth, height: image.naturalHeight, brightness: alpha ? luminance / alpha : 0 };
    }));
    return { renderer, layers };
  });
}

function expectValidBackdrop(backdrop, renderer = 'worker') {
  expect(backdrop.renderer).toBe(renderer);
  expect(backdrop.layers).toHaveLength(3);
  for (const layer of backdrop.layers) {
    if (backdrop.renderer === 'worker') {
      expect(layer.url).toMatch(/^blob:/);
      expect(layer.width).toBeGreaterThan(0);
      expect(layer.height).toBeGreaterThan(0);
      expect(layer.width * layer.height).toBeLessThanOrEqual(2_000_000);
    } else {
      expect(layer.url).toBeNull();
      expect(layer.background).toContain('gradient(');
    }
  }
}

test('both themes display three valid backdrop layers', async ({ page }, testInfo) => {
  await page.goto('/');
  const dark = await inspectBackdrop(page, 'dark');
  expectValidBackdrop(dark);
  await toggleTheme(page);
  const light = await inspectBackdrop(page, 'light', dark);
  expectValidBackdrop(light);
  expect(light.renderer).toBe(dark.renderer);
  if (light.renderer === 'worker') {
    for (let i = 0; i < 3; i++) expect(light.layers[i].url).not.toBe(dark.layers[i].url);
    // The final layer is the nearer set of stars in both theme variants.
    expect(light.layers[2].brightness).toBeLessThan(dark.layers[2].brightness);
  }
  await testInfo.attach('backdrop-renderer', { body: JSON.stringify({ dark, light }), contentType: 'application/json' });
});

test('theme and viewport changes leave the final backdrop usable', async ({ page }) => {
  await page.goto('/');
  const first = await inspectBackdrop(page, 'dark');
  const viewport = page.viewportSize();
  for (const [width, height] of [
    [viewport.width + 160, viewport.height],
    [viewport.width + 320, Math.max(360, viewport.height - 160)],
    [viewport.width + 320, Math.max(360, viewport.height - 160)],
  ]) {
    await toggleTheme(page);
    await page.setViewportSize({ width, height });
  }
  const final = await inspectBackdrop(page, 'light', first);
  expectValidBackdrop(final);
  if (first.renderer === 'worker' && final.renderer === 'worker') {
    for (let i = 0; i < 3; i++) {
      expect(final.layers[i].url).not.toBe(first.layers[i].url);
      expect(final.layers[i].width).toBeGreaterThan(first.layers[i].width);
      expect(final.layers[i].height).toBeLessThan(first.layers[i].height);
    }
    expect(final.layers[2].brightness).toBeLessThan(first.layers[2].brightness);
  }
  await openSearch(page);
});

test('a worker failure preserves a static backdrop and working navigation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript(() => {
    window.Worker = class { constructor() { throw new Error('Worker unavailable for this session'); } };
    // Isolate the backdrop fallback from graphics availability.
    Object.defineProperty(navigator, 'gpu', { configurable: true, value: undefined });
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
      return ['webgl', 'webgl2', 'experimental-webgl'].includes(kind) ? null : getContext.call(this, kind, ...args);
    };
  });
  await page.goto('/');
  await expect(page.locator('.space')).toHaveAttribute('data-space-renderer', 'fallback');
  const backdrop = await inspectBackdrop(page, 'dark');
  expectValidBackdrop(backdrop, 'fallback');
  expect(await page.locator('.space-layer').evaluateAll(layers => layers.every(layer => layer.getAnimations().length === 0))).toBe(true);
  await expect(page.getByRole('heading', { name: 'Jordan L. Wright' })).toBeVisible();
  await openSearch(page);
});

test('reduced motion disables every backdrop animation', async ({ page }) => {
  await page.goto('/');
  expectValidBackdrop(await inspectBackdrop(page, 'dark'));
  const animations = await page.locator('.space-layer').evaluateAll(layers => layers.map(layer => getComputedStyle(layer).animationName));
  expect(animations).toEqual(['none', 'none', 'none']);
  await expect(page.locator('.space')).toHaveCSS('transition-duration', '0s');
});

test('visibility changes pause and resume backdrop animation clocks', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript(() => {
    // Drive the browser lifecycle input explicitly; headless engines do not all
    // mark a tab hidden when another tab is brought forward.
    let hidden = false;
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => hidden ? 'hidden' : 'visible' });
    window.__setBackdropHidden = value => { hidden = value; document.dispatchEvent(new Event('visibilitychange')); };
    Object.defineProperty(navigator, 'gpu', { configurable: true, value: undefined });
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
      return ['webgl', 'webgl2', 'experimental-webgl'].includes(kind) ? null : getContext.call(this, kind, ...args);
    };
  });
  await page.goto('/');
  const backdrop = await inspectBackdrop(page, 'dark');
  expectValidBackdrop(backdrop);
  const animationTimes = () => page.locator('.space-layer').evaluateAll(layers => layers.flatMap(layer => layer.getAnimations().map(animation => ({ time: animation.currentTime, state: animation.playState, pending: animation.pending }))));
  await expect.poll(async () => (await animationTimes()).length).toBeGreaterThan(0);
  await expect.poll(async () => (await animationTimes()).every(animation => animation.state === 'running')).toBe(true);
  await page.evaluate(() => window.__setBackdropHidden(true));
  await expect(page.locator('.space')).toHaveClass(/space--paused/);
  await expect.poll(async () => (await animationTimes()).every(animation => animation.state === 'paused' && !animation.pending)).toBe(true);
  const paused = await animationTimes();
  expect(paused.length).toBeGreaterThan(0);
  await page.waitForTimeout(200);
  expect(await animationTimes()).toEqual(paused);
  await page.evaluate(() => window.__setBackdropHidden(false));
  await expect(page.locator('.space')).not.toHaveClass(/space--paused/);
  await expect.poll(async () => (await animationTimes())[0]?.time).toBeGreaterThan(paused[0].time);
});

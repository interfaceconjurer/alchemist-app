import { test, expect } from '@playwright/test';
import { SHOW_TOP_BAR, openSearch as openShellSearch, toggleTheme } from './shell-helpers.js';

// These projects exercise engine/device emulation. Physical phone performance
// and the native software keyboard remain separate release checks.
test.use({ reducedMotion: 'reduce', colorScheme: 'light' });
const errorsByPage = new WeakMap();

const openSearch = page => openShellSearch(page, { tap: true });

async function expectWithinViewport(page, locator, { vertical = false } = {}) {
  await expect(locator).toBeVisible();
  const bounds = await locator.boundingBox();
  expect(bounds).not.toBeNull();
  const viewport = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
  expect(bounds.x).toBeGreaterThanOrEqual(-1);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width + 1);
  if (vertical) {
    expect(bounds.y).toBeGreaterThanOrEqual(-1);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height + 1);
  }
}

async function expectCenterHittable(locator) {
  expect(await locator.evaluate(element => {
    const r = element.getBoundingClientRect();
    const target = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return target === element || element.contains(target);
  })).toBe(true);
}

test.beforeEach(async ({ page }) => {
  const errors = [];
  errorsByPage.set(page, errors);
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('.symbolContainer')).toHaveAttribute('data-render-state', 'reduced-motion');
  await expect(page.getByRole('heading', { name: 'Jordan L. Wright' })).toBeVisible();
});

test.afterEach(async ({ page }) => {
  expect(errorsByPage.get(page)).toEqual([]);
});

test('phone portrait and landscape keep controls and search inside the viewport', async ({ page }) => {
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 375, height: 812 },
    { width: 812, height: 375 },
  ]) {
    await page.setViewportSize(viewport);
    if (SHOW_TOP_BAR) {
      const search = page.getByRole('button', { name: 'Search', exact: true });
      const theme = page.getByRole('button', { name: /Switch to .* mode/ });
      await expectWithinViewport(page, search, { vertical: true });
      await expectWithinViewport(page, theme, { vertical: true });
      await expectCenterHittable(search);
      await expectCenterHittable(theme);
      const [searchBox, themeBox] = await Promise.all([search.boundingBox(), theme.boundingBox()]);
      expect(searchBox.x + searchBox.width).toBeLessThanOrEqual(themeBox.x);
      expect(searchBox.height).toBeGreaterThanOrEqual(24);
      expect(themeBox.height).toBeGreaterThanOrEqual(24);
    }
    const input = await openSearch(page);
    // overflow-x:hidden can mask clipping without creating document overflow.
    await expectWithinViewport(page, page.locator('.command-palette'), { vertical: true });
    await expectWithinViewport(page, input, { vertical: true });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await input.press('Escape');
    await expect(page.locator('.command-palette')).toHaveCount(0);
  }
});

test('touch search filters and applies a theme action that survives reload', async ({ page }) => {
  const before = await page.locator('html').getAttribute('data-theme');
  const after = before === 'dark' ? 'light' : 'dark';
  const input = await openSearch(page);
  await input.fill('toggle dark');
  const result = page.locator('.command-palette-item');
  await expect(result).toHaveCount(1);
  await expect(result).toContainText('Toggle Dark Mode');
  await result.tap();
  await expect(page.locator('.command-palette')).toHaveCount(0);
  await expect(page.locator('html')).toHaveAttribute('data-theme', after);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('theme'))).toBe(after);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', after);
  await toggleTheme(page, { tap: true });
  await expect(page.locator('html')).toHaveAttribute('data-theme', before);
});

test('search recovers from empty results and supports keyboard selection and dismissal', async ({ page }) => {
  const before = await page.locator('html').getAttribute('data-theme');
  const input = await openSearch(page);
  await input.fill('no-such-portfolio-result-72841');
  await expect(page.getByText('No results found', { exact: true })).toBeVisible();
  await input.press('ArrowDown');
  await input.press('ArrowUp');
  await input.press('Enter');
  await expect(input).toBeVisible();
  await input.fill('toggle dark');
  await expect(page.locator('.command-palette-item')).toHaveCount(1);
  await input.press('Enter');
  await expect(page.locator('.command-palette')).toHaveCount(0);
  await expect(page.locator('html')).toHaveAttribute('data-theme', before === 'dark' ? 'light' : 'dark');
  const reopened = await openSearch(page);
  await expect(reopened).toHaveValue('');
  await reopened.press('Escape');
  await expect(page.locator('.command-palette')).toHaveCount(0);
});

test('an outside touch dismisses search and leaves the header usable', async ({ page }) => {
  await openSearch(page);
  const viewport = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
  // The lower corner is outside the palette on every configured device.
  await page.touchscreen.tap(viewport.width - 4, viewport.height - 4);
  await expect(page.locator('.command-palette')).toHaveCount(0);
  if (!SHOW_TOP_BAR) return;
  const before = await page.locator('html').getAttribute('data-theme');
  await page.getByRole('button', { name: /Switch to .* mode/ }).tap();
  await expect(page.locator('html')).toHaveAttribute('data-theme', before === 'dark' ? 'light' : 'dark');
});

test('portrait and landscape navigation links remain reachable without horizontal scrolling', async ({ page }) => {
  // Software-rendered CI includes shader startup and checks every link in both orientations.
  test.setTimeout(90_000);
  for (const viewport of [{ width: 320, height: 568 }, { width: 812, height: 375 }]) {
    await page.setViewportSize(viewport);
    const navigation = page.locator('nav.nav');
    const links = navigation.getByRole('link');
    await expect(links).toHaveCount(3);
    for (let i = 0; i < await links.count(); i++) {
      const link = links.nth(i);
      await link.scrollIntoViewIfNeeded();
      await expect(link).toBeInViewport();
      await expectWithinViewport(page, link);
      await expectCenterHittable(link);
      await expect(link).toHaveAttribute('href', /^https:\/\//);
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toHaveAttribute('rel', /noopener/);
    }
    expect(await page.evaluate(() => document.querySelector('.left-panel').scrollWidth - document.querySelector('.left-panel').clientWidth)).toBeLessThanOrEqual(1);
  }
});

test('crossing the responsive breakpoint preserves theme and public-shell controls', async ({ page }) => {
  // Four viewport changes also resize the live canvas under software rendering.
  test.setTimeout(90_000);
  await toggleTheme(page, { tap: true });
  const theme = await page.locator('html').getAttribute('data-theme');
  for (const viewport of [
    { width: 899, height: 600 }, { width: 900, height: 600 },
    { width: 1280, height: 800 }, { width: 320, height: 568 },
  ]) {
    await page.setViewportSize(viewport);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await expect(page.locator('.main')).toHaveClass(/main--stage-hidden/);
    await expect(page.locator('.stage')).not.toBeVisible();
    await expectWithinViewport(page, page.locator('.left-panel'));
    const input = await openSearch(page);
    await expectWithinViewport(page, page.locator('.command-palette'));
    await input.press('Escape');
    await expect(page.locator('.command-palette')).toHaveCount(0);
  }
});

const overlaps = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

for (const [id, kind, media, gallery] of [
  ['apollo-portfolio-review', 'deck', '.artifact-viewer-embed', false],
  ['fine-tunes', 'image gallery', '.artifact-viewer-image', true],
]) {
  test(`the ${kind} viewer fills a landscape phone with its controls beside the artifact`, async ({ page }) => {
    // Software-rendered CI is slow to lay out and dispatch taps at this size.
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 812, height: 375 });
    await page.locator(`[data-work-item-id="${id}"]`).tap();
    const open = page.locator('.work-content-viewable').first();
    await open.scrollIntoViewIfNeeded();
    await open.tap();
    const viewer = page.locator('.artifact-viewer');
    await expect(viewer).toBeVisible();

    const artifact = viewer.locator(media);
    const controls = [viewer.getByRole('button', { name: 'Close' }), viewer.locator('.artifact-viewer-caption')];
    if (gallery) controls.push(viewer.getByRole('button', { name: 'Previous' }), viewer.getByRole('button', { name: 'Next' }));
    await expectWithinViewport(page, artifact, { vertical: true });
    // Height is the scarce dimension: the artifact gets nearly all of it.
    expect((await artifact.boundingBox()).height).toBeGreaterThanOrEqual(375 * 0.75);
    for (const control of controls) {
      await expectWithinViewport(page, control, { vertical: true });
      await expectCenterHittable(control);
      expect(overlaps(await artifact.boundingBox(), await control.boundingBox())).toBe(false);
    }
    if (gallery) {
      await viewer.getByRole('button', { name: 'Next' }).tap();
      await expect(viewer.locator('.artifact-viewer-count')).toHaveText(/^2 \//);
    }
    await viewer.getByRole('button', { name: 'Close' }).tap();
    await expect(viewer).not.toBeVisible();
  });
}

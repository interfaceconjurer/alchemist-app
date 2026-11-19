import { test, expect } from '@playwright/test';

// Each work item has its own address: /sketch/<title>. Runs against the
// production build served by the real Express server, so deep links go through
// its HTML fallback exactly as they do when deployed.
test.use({ reducedMotion: 'reduce' });

const sketch = (page) => page.locator('.stage .work-content');
const at = (page) => new URL(page.url()).pathname;

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
});

test('a link to a sketch opens it, names it in the tab title and survives a reload', async ({ page }) => {
  await page.goto('/sketch/pytone');
  await expect(sketch(page)).toContainText('PyTone');
  await expect(page).toHaveTitle(/^PyTone · /);
  await page.reload();
  await expect(sketch(page)).toContainText('PyTone');
  expect(at(page)).toBe('/sketch/pytone');
});

test('opening a sketch updates the address; back closes it and forward reopens it', async ({ page }) => {
  await page.goto('/');
  const card = page.locator('a[data-work-item-id="fine-tunes"]').first();
  await expect(card).toHaveAttribute('href', '/sketch/fine-tunes');
  await card.click();
  await expect(page).toHaveURL(/\/sketch\/fine-tunes$/);
  await expect(sketch(page)).toContainText('Fine Tunes');
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(sketch(page)).toHaveCount(0);
  await page.goForward();
  await expect(page).toHaveURL(/\/sketch\/fine-tunes$/);
  await expect(sketch(page)).toContainText('Fine Tunes');
});

test('unknown sketch links go home even with a saved workspace', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('workspace-state', JSON.stringify({
    openTabIds: ['fine-tunes'], activeTabId: 'fine-tunes',
  })));
  for (const suffix of ['no-such-thing', 'missing.v2', '%E0%A4%A']) {
    const response = await page.goto('/sketch/' + suffix);
    expect(response.status()).toBe(200);
    await expect(page).toHaveURL(/\/$/);
    await expect(sketch(page)).toHaveCount(0);
  }
});

test('desktop tab close traverses to the previous sketch without duplicating it', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 850 });
  await page.locator('[data-work-item-id="fine-tunes"]').click();
  await page.locator('[data-work-item-id="ascii-image-generator"]').click();
  await page.getByRole('button', { name: 'Close PyTone' }).click();
  await expect(page).toHaveURL(/\/sketch\/fine-tunes$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(sketch(page)).toHaveCount(0);
  await page.goForward();
  await expect(sketch(page)).toContainText('Fine Tunes');
});

test('phone Back reopens the sketch replaced by a command palette selection', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.locator('[data-work-item-id="fine-tunes"]').click();
  await page.keyboard.press('Control+k');
  const input = page.getByRole('combobox');
  await input.fill('PyTone');
  await input.press('Enter');
  await expect(page).toHaveURL(/\/sketch\/pytone$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/sketch\/fine-tunes$/);
  await expect(sketch(page)).toContainText('Fine Tunes');
});

test('a new selection wins when a close has just been requested', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 850 });
  await page.locator('[data-work-item-id="fine-tunes"]').click();
  await page.evaluate(() => {
    document.querySelector('[aria-label="Close Fine Tunes"]').click();
    queueMicrotask(() => document.querySelector('[data-work-item-id="ascii-image-generator"]').click());
  });
  await expect(page).toHaveURL(/\/sketch\/pytone$/);
  await expect(sketch(page)).toContainText('PyTone');
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(sketch(page)).toHaveCount(0);
});

test('a simultaneous browser Back and close return to home once', async ({ page }) => {
  await page.goto('/manifest.json');
  await page.goto('/');
  await page.setViewportSize({ width: 1280, height: 850 });
  await page.locator('[data-work-item-id="fine-tunes"]').click();
  await page.evaluate(() => {
    document.querySelector('[aria-label="Close Fine Tunes"]').click();
    queueMicrotask(() => history.back());
  });
  await expect(page).toHaveURL(/\/$/);
  await expect(sketch(page)).toHaveCount(0);
  await page.goForward();
  await expect(sketch(page)).toContainText('Fine Tunes');
});

test('sketch HTML identifies the shared item before JavaScript runs', async ({ request }) => {
  const response = await request.get('/sketch/PYTONE/');
  const html = await response.text();
  expect(html).toMatch(/<title[^>]*>PyTone · /);
  expect(html).toContain('rel="canonical" href="https://jordanwright.codes/sketch/pytone"');
  expect(html).toContain('property="og:url" content="https://jordanwright.codes/sketch/pytone"');
});

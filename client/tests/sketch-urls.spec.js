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

test('an unknown sketch goes home', async ({ page }) => {
  await page.goto('/sketch/no-such-thing');
  await expect(page).toHaveURL(/\/$/);
  await expect(sketch(page)).toHaveCount(0);
});

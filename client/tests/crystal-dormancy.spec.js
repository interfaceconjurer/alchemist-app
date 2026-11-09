import { test, expect } from '@playwright/test';

// Pressing the crystal sends it dormant (motion stops, light fades) until the
// user lets go and leaves it alone. This replaced drag-to-orbit.

const surface = (page) => page.locator('.crystal-surface');

async function waitForCrystal(page) {
  await page.goto('/');
  // 'starting' until the first rendered frame (shader compile can take a few
  // seconds under software GL); only then is it meaningful to press it.
  await expect(surface(page)).toHaveAttribute('data-dormancy', 'awake', { timeout: 20_000 });
}

async function center(page) {
  const box = await surface(page).boundingBox();
  return { x: box.x + box.width / 2, y: box.y + box.height * 0.45 };
}

test('press and drag sends the crystal dormant, and it wakes only after being left alone', async ({ page }) => {
  await waitForCrystal(page);
  const { x, y } = await center(page);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await expect(surface(page)).toHaveAttribute('aria-pressed', 'true'); // reflects the press immediately
  await page.mouse.move(x + 120, y + 30, { steps: 10 });
  await expect(surface(page)).toHaveAttribute('data-dormancy', 'dormant', { timeout: 5000 });
  // Still held: stays dormant indefinitely.
  await page.waitForTimeout(1500);
  await expect(surface(page)).toHaveAttribute('data-dormancy', 'dormant');
  await page.mouse.up();
  // Quiet period first, then a slow wake.
  await page.waitForTimeout(600);
  await expect(surface(page)).toHaveAttribute('data-dormancy', 'dormant');
  await expect(surface(page)).toHaveAttribute('data-dormancy', 'awake', { timeout: 6000 });
  await expect(surface(page)).toHaveAttribute('aria-pressed', 'false');
});

test('a drag no longer orbits the crystal (no camera controls on the canvas)', async ({ page }) => {
  await waitForCrystal(page);
  // OrbitControls set touch-action:none and grab cursors on the canvas; dormancy leaves vertical scroll free.
  await expect(surface(page)).toHaveCSS('touch-action', 'pan-y');
});

test('keyboard users can still and release the crystal', async ({ page }) => {
  await waitForCrystal(page);
  await surface(page).focus();
  await page.keyboard.press('Enter');
  await expect(surface(page)).toHaveAttribute('aria-pressed', 'true');
  await expect(surface(page)).toHaveAttribute('data-dormancy', 'dormant', { timeout: 5000 });
  await page.keyboard.press('Enter');
  await expect(surface(page)).toHaveAttribute('data-dormancy', 'awake', { timeout: 6000 });
});

test('a touch on the crystal (phones/tablets) sends it dormant and it wakes after', async ({ page, browserName }, testInfo) => {
  test.skip(!testInfo.project.use.hasTouch, 'touch devices only');
  await waitForCrystal(page);
  const { x, y } = await center(page);
  await page.touchscreen.tap(x, y);
  await expect(surface(page)).toHaveAttribute('data-dormancy', /dormant|changing/, { timeout: 5000 });
  await expect(surface(page)).toHaveAttribute('data-dormancy', 'awake', { timeout: 8000 });
});

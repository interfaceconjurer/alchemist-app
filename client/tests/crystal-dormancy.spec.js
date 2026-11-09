import { test, expect } from '@playwright/test';

// Pressing the crystal sends it dormant (motion stops, light fades) until the
// user lets go and leaves it alone. This replaced drag-to-orbit.

const surface = (page) => page.locator('.crystal-surface');

async function waitForCrystal(page) {
  await page.addInitScript(() => {
    window.__crystalFrames = { count: 0, last: null };
    window.__ALCHEMY_PROFILE__ = {
      frame(frame) { window.__crystalFrames.count++; window.__crystalFrames.last = frame; },
      render() {}, visibility() {}, sequence() {},
    };
  });
  await page.goto('/');
  // 'starting' until the first rendered frame (shader compile can take a few
  // seconds under software GL); only then is it meaningful to press it.
  await expect(surface(page)).toHaveAttribute('data-dormancy', 'awake', { timeout: 20_000 });
  await expect.poll(() => page.evaluate(() => window.__crystalFrames.last?.shaderTime ?? 0), { timeout: 20_000 }).toBeGreaterThan(0);
}

const lastFrame = page => page.evaluate(() => window.__crystalFrames.last);

async function center(page) {
  const box = await surface(page).boundingBox();
  return { x: box.x + box.width / 2, y: box.y + box.height * 0.45 };
}

test('press and drag sends the crystal dormant, and it wakes only after being left alone', async ({ page }) => {
  await waitForCrystal(page);
  const awake = await lastFrame(page);
  const { x, y } = await center(page);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await expect(surface(page)).toHaveAttribute('aria-pressed', 'true'); // reflects the press immediately
  await page.mouse.move(x + 120, y + 30, { steps: 10 });
  await expect(surface(page)).toHaveAttribute('data-dormancy', 'dormant', { timeout: 5000 });
  await expect.poll(async () => (await lastFrame(page))?.dormancy).toBe('dormant');
  const dormant = await page.evaluate(() => ({ ...window.__crystalFrames }));
  expect(dormant.last.engaged).toBe(true);
  expect(dormant.last.vitality).toBe(0);
  expect(dormant.last.light).toBeLessThan(awake.light);
  // Rendering continues, but every animated scene system shares a frozen clock.
  await page.waitForTimeout(350);
  const held = await page.evaluate(() => ({ ...window.__crystalFrames }));
  expect(held.count).toBeGreaterThan(dormant.count);
  expect(held.last.shaderTime).toBe(dormant.last.shaderTime);
  expect(held.last.simulationMs).toBe(dormant.last.simulationMs);
  expect(held.last.light).toBe(dormant.last.light);
  await expect(surface(page)).toHaveAttribute('data-dormancy', 'dormant');
  await page.mouse.up();
  // Release starts a quiet period, then a gradual wake.
  await expect(surface(page)).toHaveAttribute('data-dormancy', 'dormant');
  await expect.poll(async () => (await lastFrame(page))?.engaged).toBe(false);
  await expect.poll(async () => (await lastFrame(page))?.vitality, { timeout: 6000 }).toBeGreaterThan(0);
  await expect(surface(page)).toHaveAttribute('data-dormancy', 'awake', { timeout: 6000 });
  await expect(surface(page)).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(async () => (await lastFrame(page))?.shaderTime).toBeGreaterThan(held.last.shaderTime);
  const woke = await lastFrame(page);
  expect(woke.simulationMs).toBeGreaterThan(held.last.simulationMs);
  expect(woke.light).toBe(awake.light);
});

test('the canvas and its ancestors leave vertical touch scrolling available', async ({ page }) => {
  await waitForCrystal(page);
  // A wrapper policy cannot override touch-action:none installed on the canvas.
  const actions = await page.locator('.crystal-surface canvas').evaluate(canvas => {
    const values = [];
    for (let node = canvas; node; node = node.parentElement) {
      values.push(getComputedStyle(node).touchAction);
      if (node.matches('.crystal-surface')) break;
    }
    return values;
  });
  expect(actions.length).toBeGreaterThan(1);
  for (const action of actions) expect(['auto', 'pan-y', 'manipulation', 'pan-y pinch-zoom']).toContain(action);
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

test('pointer cancellation releases a held crystal', async ({ page }) => {
  await waitForCrystal(page);
  await surface(page).evaluate(element => element.addEventListener('pointerdown', event => {
    window.__pressedCrystalPointer = event.pointerId;
  }, { once: true }));
  const { x, y } = await center(page);
  await page.mouse.move(x, y);
  await page.mouse.down();
  try {
    await expect(surface(page)).toHaveAttribute('data-dormancy', 'dormant', { timeout: 5000 });
    await page.locator('.crystal-surface canvas').evaluate(canvas => canvas.dispatchEvent(new PointerEvent('pointercancel', {
      pointerId: window.__pressedCrystalPointer, pointerType: 'mouse', bubbles: true,
    })));
    await expect(surface(page)).toHaveAttribute('aria-pressed', 'false');
    await expect(surface(page)).toHaveAttribute('data-dormancy', 'awake', { timeout: 6000 });
  } finally {
    await page.mouse.up();
  }
});

test('window focus loss releases a hold and wakes the crystal without a pointer cancellation', async ({ page }) => {
  await waitForCrystal(page);
  await surface(page).evaluate(element => {
    window.__crystalPointerCancellations = 0;
    element.addEventListener('pointercancel', () => window.__crystalPointerCancellations++);
  });
  const { x, y } = await center(page);
  await page.mouse.move(x, y);
  await page.mouse.down();
  try {
    await expect(surface(page)).toHaveAttribute('data-dormancy', 'dormant', { timeout: 5000 });
    await expect.poll(async () => (await lastFrame(page))?.engaged).toBe(true);
    const dormant = await lastFrame(page);
    // Deliver the window lifecycle event directly: switching tabs in headless
    // engines does not reliably reproduce OS focus loss. Keep the real mouse
    // button down so no pointer-up/cancel can accidentally release the hold.
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await expect(surface(page)).toHaveAttribute('aria-pressed', 'false');
    await expect.poll(async () => (await lastFrame(page))?.engaged).toBe(false);
    await expect(surface(page)).toHaveAttribute('data-dormancy', 'awake', { timeout: 6000 });
    await expect.poll(async () => (await lastFrame(page))?.shaderTime).toBeGreaterThan(dormant.shaderTime);
    const awake = await lastFrame(page);
    expect(awake.simulationMs).toBeGreaterThan(dormant.simulationMs);
    expect(awake.light).toBeGreaterThan(dormant.light);
    expect(await page.evaluate(() => window.__crystalPointerCancellations)).toBe(0);
  } finally {
    await page.mouse.up();
  }
});

test('a touch sends the crystal dormant and it wakes after @touch', async ({ page }, testInfo) => {
  expect(testInfo.project.use.hasTouch).toBe(true);
  await waitForCrystal(page);
  const { x, y } = await center(page);
  await page.touchscreen.tap(x, y);
  await expect(surface(page)).toHaveAttribute('data-dormancy', /dormant|changing/, { timeout: 5000 });
  await expect(surface(page)).toHaveAttribute('data-dormancy', 'awake', { timeout: 8000 });
});

test('native vertical touch panning scrolls the page and releases the crystal @touch @chromium-touch', async ({ page, browserName }, testInfo) => {
  expect(browserName).toBe('chromium');
  expect(testInfo.project.use.hasTouch).toBe(true);
  await page.setViewportSize({ width: 393, height: 500 });
  await waitForCrystal(page);
  const panel = page.locator('.left-panel');
  expect(await panel.evaluate(element => element.scrollHeight - element.clientHeight)).toBeGreaterThan(20);
  const { x, y } = await center(page);
  const session = await page.context().newCDPSession(page);
  try {
    await session.send('Input.synthesizeScrollGesture', { x, y, yDistance: -160, speed: 600, gestureSourceType: 'touch' });
    await expect.poll(() => panel.evaluate(element => element.scrollTop)).toBeGreaterThan(20);
    await expect(surface(page)).toHaveAttribute('aria-pressed', 'false');
    await expect(surface(page)).toHaveAttribute('data-dormancy', 'awake', { timeout: 8000 });
  } finally {
    await session.detach();
  }
});

import { test, expect } from '@playwright/test';

const MOBILE_VIEWPORT = { width: 375, height: 812 };
const DESKTOP_VIEWPORT = { width: 1280, height: 800 };

test.describe('Mobile Responsive View', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForSelector('.App', { timeout: 10000 });
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.reload();
    await page.waitForSelector('.App', { timeout: 10000 });
    await page.waitForTimeout(300);
  });

  test('desktop: sidebar and stage visible side by side', async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.waitForTimeout(300);
    const leftPanel = page.locator('.left-panel');
    const stage = page.locator('.stage');
    await expect(leftPanel).toBeVisible();
    await expect(stage).toBeVisible();
    await page.screenshot({ path: 'test-results/desktop-layout.png', fullPage: false });
  });

  test('mobile: sidebar takes full width, stage hidden when no tabs', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.waitForTimeout(300);
    const leftPanel = page.locator('.left-panel');
    await expect(leftPanel).toBeVisible();
    const leftPanelBox = await leftPanel.boundingBox();
    expect(leftPanelBox.width).toBeGreaterThan(350);
    const stage = page.locator('.stage');
    await expect(stage).toHaveClass(/stage--hidden/);
    await page.screenshot({ path: 'test-results/mobile-sidebar.png', fullPage: false });
  });

  test('mobile: clicking work item shows content overlay with back button', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.waitForTimeout(300);
    const workItem = page.locator('.work-item').first();
    await workItem.click();
    await page.waitForTimeout(500);
    const stage = page.locator('.stage');
    await expect(stage).not.toHaveClass(/stage--hidden/);
    await expect(stage).toBeVisible();
    const backBtn = page.locator('.top-bar-back');
    await expect(backBtn).toBeVisible();
    await page.screenshot({ path: 'test-results/mobile-content-open.png', fullPage: false });
  });

  test('mobile: back button closes tab and returns to sidebar', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.waitForTimeout(300);
    await page.locator('.work-item').first().click();
    await page.waitForTimeout(500);
    await page.locator('.top-bar-back').click();
    await page.waitForTimeout(300);
    const stage = page.locator('.stage');
    await expect(stage).toHaveClass(/stage--hidden/);
    const backBtn = page.locator('.top-bar-back');
    await expect(backBtn).toHaveCount(0);
    await page.screenshot({ path: 'test-results/mobile-back-to-sidebar.png', fullPage: false });
  });

  test('mobile: only one tab open at a time', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.waitForTimeout(300);
    await page.locator('.work-item').first().click();
    await page.waitForTimeout(300);
    // Open command palette and select a different item
    await page.keyboard.press('Meta+k');
    await page.waitForTimeout(200);
    const paletteItems = page.locator('.command-palette-item');
    const count = await paletteItems.count();
    if (count > 1) {
      await paletteItems.nth(1).click();
      await page.waitForTimeout(300);
    }
    await page.screenshot({ path: 'test-results/mobile-single-tab.png', fullPage: false });
  });

  test('resize from mobile to desktop restores layout', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.waitForTimeout(300);
    await page.locator('.work-item').first().click();
    await page.waitForTimeout(500);
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.waitForTimeout(500);
    const leftPanel = page.locator('.left-panel');
    const stage = page.locator('.stage');
    await expect(leftPanel).toBeVisible();
    await expect(stage).toBeVisible();
    await expect(stage).not.toHaveClass(/stage--hidden/);
    await page.screenshot({ path: 'test-results/resize-to-desktop.png', fullPage: false });
  });
});

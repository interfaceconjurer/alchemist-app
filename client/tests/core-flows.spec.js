import { test, expect } from '@playwright/test';
import { ensureCleanState } from './test-helpers.js';

test.describe('Core User Flows', () => {
  test.beforeEach(async ({ page }) => {
    await ensureCleanState(page);
  });

  test('open tabs via click and double-click', async ({ page }) => {
    await page.locator('.work-item').first().click();
    await page.waitForTimeout(400);
    await expect(page.locator('.stage-tab')).toHaveCount(1);
    await expect(page.locator('.stage-tab--preview')).toHaveCount(1);

    await page.locator('.work-item').first().dblclick();
    await page.waitForTimeout(300);
    await expect(page.locator('.stage-tab--preview')).toHaveCount(0);
  });

  test('create split view via tab drag', async ({ page }) => {
    await page.locator('.work-item').first().dblclick();
    await page.locator('.work-item').nth(1).dblclick();
    await page.waitForTimeout(300);

    const tab = page.locator('.stage-tab').first();
    const stage = page.locator('.stage-main');
    const tabBox = await tab.boundingBox();
    const stageBox = await stage.boundingBox();

    await page.mouse.move(tabBox.x + tabBox.width / 2, tabBox.y + tabBox.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(200);
    await page.mouse.move(tabBox.x + tabBox.width / 2 + 10, tabBox.y + tabBox.height / 2);
    await page.mouse.move(stageBox.x + stageBox.width * 0.2, stageBox.y + stageBox.height / 2);
    await page.mouse.up();

    await expect(page.locator('.stage-split-container')).toBeVisible();
    await expect(page.locator('.stage-pane--left .stage-tab')).toHaveCount(1);
    await expect(page.locator('.stage-pane--right .stage-tab')).toHaveCount(1);
  });

  test('close last tab in pane collapses split', async ({ page }) => {
    await page.locator('.work-item').first().dblclick();
    await page.locator('.work-item').nth(1).dblclick();
    await page.waitForTimeout(300);

    const tab = page.locator('.stage-tab').first();
    const stage = page.locator('.stage-main');
    const tabBox = await tab.boundingBox();
    const stageBox = await stage.boundingBox();

    await page.mouse.move(tabBox.x + tabBox.width / 2, tabBox.y + tabBox.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(200);
    await page.mouse.move(tabBox.x + tabBox.width / 2 + 10, tabBox.y + tabBox.height / 2);
    await page.mouse.move(stageBox.x + stageBox.width * 0.2, stageBox.y + stageBox.height / 2);
    await page.mouse.up();

    await expect(page.locator('.stage-split-container')).toBeVisible();
    await page.locator('.stage-pane--left .stage-tab-close').first().click();
    await page.waitForTimeout(300);
    await expect(page.locator('.stage-split-container')).not.toBeVisible();
  });

  test('workspace state persists across reload', async ({ page }) => {
    await page.locator('.work-item').first().dblclick();
    await page.locator('.work-item').nth(1).dblclick();
    await page.waitForTimeout(800);

    await page.reload();
    await page.waitForSelector('.App', { timeout: 10000 });
    await page.waitForTimeout(500);

    await expect(page.locator('.stage-tab')).toHaveCount(2);
  });

  test('command palette opens via keyboard shortcut', async ({ page }) => {
    await page.keyboard.press('Meta+k');
    await page.waitForTimeout(200);
    await expect(page.locator('.command-palette')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    await expect(page.locator('.command-palette')).not.toBeVisible();
  });
});

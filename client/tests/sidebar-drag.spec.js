import { test, expect } from '@playwright/test';

test.describe('Sidebar Drag to Stage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.App', { timeout: 10000 });
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.reload();
    await page.waitForSelector('.App', { timeout: 10000 });
    await page.waitForTimeout(300);
  });

  test('drag sidebar item to empty stage opens as tab', async ({ page }) => {
    const workItem = page.locator('.work-item').first();
    const stageMain = page.locator('.stage-main');
    const itemBox = await workItem.boundingBox();
    const stageBox = await stageMain.boundingBox();

    await page.mouse.move(itemBox.x + itemBox.width / 2, itemBox.y + itemBox.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(200);
    await page.mouse.move(itemBox.x + itemBox.width / 2 + 10, itemBox.y + itemBox.height / 2);
    await page.mouse.move(stageBox.x + stageBox.width / 2, stageBox.y + stageBox.height / 2);
    await page.waitForTimeout(100);

    await page.screenshot({ path: 'test-results/sidebar-drag-empty-stage.png' });

    await page.mouse.up();
    await page.waitForTimeout(300);

    await expect(page.locator('.stage-tab')).toHaveCount(1);
    await page.screenshot({ path: 'test-results/sidebar-drag-empty-dropped.png' });
  });

  test('drag sidebar item to middle third adds as tab', async ({ page }) => {
    await page.locator('.work-item').first().dblclick();
    await page.waitForTimeout(500);

    const workItem = page.locator('.work-item').nth(1);
    const stageMain = page.locator('.stage-main');
    const itemBox = await workItem.boundingBox();
    const stageBox = await stageMain.boundingBox();

    await page.mouse.move(itemBox.x + itemBox.width / 2, itemBox.y + itemBox.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(200);
    await page.mouse.move(itemBox.x + itemBox.width / 2 + 10, itemBox.y + itemBox.height / 2);
    await page.mouse.move(stageBox.x + stageBox.width / 2, stageBox.y + stageBox.height / 2);
    await page.waitForTimeout(100);

    await page.screenshot({ path: 'test-results/sidebar-drag-middle-zone.png' });

    await page.mouse.up();
    await page.waitForTimeout(300);

    await expect(page.locator('.stage-tab')).toHaveCount(2);
    await expect(page.locator('.stage-split-container')).not.toBeVisible();
  });

  test('drag sidebar item to left third creates split', async ({ page }) => {
    await page.locator('.work-item').first().dblclick();
    await page.waitForTimeout(500);

    const workItem = page.locator('.work-item').nth(1);
    const stageMain = page.locator('.stage-main');
    const itemBox = await workItem.boundingBox();
    const stageBox = await stageMain.boundingBox();

    await page.mouse.move(itemBox.x + itemBox.width / 2, itemBox.y + itemBox.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(200);
    await page.mouse.move(itemBox.x + itemBox.width / 2 + 10, itemBox.y + itemBox.height / 2);
    await page.mouse.move(stageBox.x + stageBox.width * 0.15, stageBox.y + stageBox.height / 2);
    await page.waitForTimeout(100);

    await page.screenshot({ path: 'test-results/sidebar-drag-left-zone.png' });

    await page.mouse.up();
    await page.waitForTimeout(300);

    await expect(page.locator('.stage-split-container')).toBeVisible();
    await page.screenshot({ path: 'test-results/sidebar-drag-left-split.png' });
  });

  test('drag sidebar item to right third creates split', async ({ page }) => {
    await page.locator('.work-item').first().dblclick();
    await page.waitForTimeout(500);

    const workItem = page.locator('.work-item').nth(1);
    const stageMain = page.locator('.stage-main');
    const itemBox = await workItem.boundingBox();
    const stageBox = await stageMain.boundingBox();

    await page.mouse.move(itemBox.x + itemBox.width / 2, itemBox.y + itemBox.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(200);
    await page.mouse.move(itemBox.x + itemBox.width / 2 + 10, itemBox.y + itemBox.height / 2);
    await page.mouse.move(stageBox.x + stageBox.width * 0.85, stageBox.y + stageBox.height / 2);
    await page.waitForTimeout(100);

    await page.screenshot({ path: 'test-results/sidebar-drag-right-zone.png' });

    await page.mouse.up();
    await page.waitForTimeout(300);

    await expect(page.locator('.stage-split-container')).toBeVisible();
  });

  test('click still works after drag feature added', async ({ page }) => {
    await page.locator('.work-item').first().click();
    await page.waitForTimeout(400);
    await expect(page.locator('.stage-tab')).toHaveCount(1);
  });

  test('double-click still works', async ({ page }) => {
    await page.locator('.work-item').first().dblclick();
    await page.waitForTimeout(400);
    await expect(page.locator('.stage-tab')).toHaveCount(1);
    await expect(page.locator('.stage-tab--preview')).toHaveCount(0);
  });
});

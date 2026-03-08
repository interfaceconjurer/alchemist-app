import { test, expect } from '@playwright/test';
import { ensureCleanState } from './test-helpers.js';

test.describe('Comprehensive Split View Tests', () => {
  test.beforeEach(async ({ page }) => {
    await ensureCleanState(page);
  });

  test('scenario: two persistent tabs, add preview to focused pane', async ({ page }) => {
    // Open two persistent tabs
    await page.locator('.work-item').first().dblclick();
    await page.waitForTimeout(200);
    await page.locator('.work-item').nth(1).dblclick();
    await page.waitForTimeout(200);

    // Create split view
    const firstTab = await page.locator('.stage-tab').first();
    const tabBox = await firstTab.boundingBox();
    const stageMain = await page.locator('.stage-main');
    const stageBox = await stageMain.boundingBox();

    await page.mouse.move(tabBox.x + tabBox.width / 2, tabBox.y + tabBox.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(200);
    await page.mouse.move(tabBox.x + tabBox.width / 2 + 10, tabBox.y + tabBox.height / 2);
    await page.mouse.move(stageBox.x + stageBox.width * 0.2, stageBox.y + stageBox.height / 2);
    await page.mouse.up();

    // Verify split created with left pane active
    await expect(page.locator('.stage-split-container')).toBeVisible();
    await expect(page.locator('.stage-pane--left')).toHaveClass(/stage-pane--active/);

    // Single-click to add preview to left pane
    await page.locator('.work-item').nth(2).click();
    await page.waitForTimeout(300);

    // Verify preview appears in left pane only
    await expect(page.locator('.stage-pane--left .stage-tab--preview')).toHaveCount(1);
    await expect(page.locator('.stage-pane--right .stage-tab--preview')).toHaveCount(0);
    await expect(page.locator('.stage-pane--left .stage-tab')).toHaveCount(2); // 1 persistent + 1 preview
  });

  test('scenario: drag preview tab makes it persistent', async ({ page }) => {
    // Setup with preview tab
    await page.locator('.work-item').first().dblclick();
    await page.locator('.work-item').nth(1).click(); // Preview
    await page.waitForTimeout(300);

    // Verify we have one preview tab
    await expect(page.locator('.stage-tab--preview')).toHaveCount(1);

    // Create split by dragging the preview tab
    const previewTab = await page.locator('.stage-tab--preview');
    const tabBox = await previewTab.boundingBox();
    const stageMain = await page.locator('.stage-main');
    const stageBox = await stageMain.boundingBox();

    await page.mouse.move(tabBox.x + tabBox.width / 2, tabBox.y + tabBox.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(200);
    await page.mouse.move(tabBox.x + tabBox.width / 2 + 10, tabBox.y + tabBox.height / 2);
    await page.mouse.move(stageBox.x + stageBox.width * 0.8, stageBox.y + stageBox.height / 2);
    await page.mouse.up();

    // Verify the preview tab became persistent when dragged
    await expect(page.locator('.stage-split-container')).toBeVisible();
    await expect(page.locator('.stage-pane--right .stage-tab')).toHaveCount(1);
    await expect(page.locator('.stage-pane--right .stage-tab--preview')).toHaveCount(0); // No longer preview
  });

  test('scenario: both panes with mixed tabs, click replaces correct preview', async ({ page }) => {
    // Setup: Create split with 2 persistent tabs
    await page.locator('.work-item').first().dblclick();
    await page.locator('.work-item').nth(1).dblclick();

    const firstTab = await page.locator('.stage-tab').first();
    const tabBox = await firstTab.boundingBox();
    const stageMain = await page.locator('.stage-main');
    const stageBox = await stageMain.boundingBox();

    await page.mouse.move(tabBox.x + tabBox.width / 2, tabBox.y + tabBox.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(200);
    await page.mouse.move(tabBox.x + tabBox.width / 2 + 10, tabBox.y + tabBox.height / 2);
    await page.mouse.move(stageBox.x + stageBox.width * 0.2, stageBox.y + stageBox.height / 2);
    await page.mouse.up();

    // Left pane is now active (we just dragged there)
    // Add preview tab to left pane
    await page.locator('.work-item').nth(2).click();
    await page.waitForTimeout(300);

    // Verify left pane has 1 persistent + 1 preview
    await expect(page.locator('.stage-pane--left .stage-tab')).toHaveCount(2);
    await expect(page.locator('.stage-pane--left .stage-tab--preview')).toHaveCount(1);

    // Switch to right pane
    const rightPaneTab = await page.locator('.stage-pane--right .stage-tab').first();
    await rightPaneTab.click();
    await page.waitForTimeout(200);

    // Add preview tab to right pane
    await page.locator('.work-item').nth(3).click();
    await page.waitForTimeout(300);

    // Verify right pane has 1 persistent + 1 preview
    await expect(page.locator('.stage-pane--right .stage-tab')).toHaveCount(2);
    await expect(page.locator('.stage-pane--right .stage-tab--preview')).toHaveCount(1);

    // Get preview titles
    const leftPreviewTitle = await page.locator('.stage-pane--left .stage-tab--preview .stage-tab-title').textContent();
    const rightPreviewTitle = await page.locator('.stage-pane--right .stage-tab--preview .stage-tab-title').textContent();

    // Click new work item (right pane is focused) - should replace right preview only
    await page.locator('.work-item').nth(4).click();
    await page.waitForTimeout(300);

    // Verify only right preview changed
    const newRightPreviewTitle = await page.locator('.stage-pane--right .stage-tab--preview .stage-tab-title').textContent();
    expect(newRightPreviewTitle).not.toBe(rightPreviewTitle);
    await expect(page.locator('.stage-pane--left .stage-tab--preview .stage-tab-title')).toHaveText(leftPreviewTitle);

    // Still 2 tabs per pane (1 persistent + 1 preview each)
    await expect(page.locator('.stage-pane--left .stage-tab')).toHaveCount(2);
    await expect(page.locator('.stage-pane--right .stage-tab')).toHaveCount(2);
  });

  test('persistence: split view with per-pane preview tabs survives reload', async ({ page }) => {
    // Create split with persistent tabs first
    await page.locator('.work-item').first().dblclick();
    await page.locator('.work-item').nth(1).dblclick();

    const firstTab = await page.locator('.stage-tab').first();
    const tabBox = await firstTab.boundingBox();
    const stageMain = await page.locator('.stage-main');
    const stageBox = await stageMain.boundingBox();

    await page.mouse.move(tabBox.x + tabBox.width / 2, tabBox.y + tabBox.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(200);
    await page.mouse.move(tabBox.x + tabBox.width / 2 + 10, tabBox.y + tabBox.height / 2);
    await page.mouse.move(stageBox.x + stageBox.width * 0.2, stageBox.y + stageBox.height / 2);
    await page.mouse.up();

    // Add preview to left pane (currently active)
    await page.locator('.work-item').nth(2).click();
    await page.waitForTimeout(300);

    const leftPreviewTitle = await page.locator('.stage-pane--left .stage-tab--preview .stage-tab-title').textContent();
    console.log('Left preview before reload:', leftPreviewTitle);

    // Switch to right pane and add preview there
    const rightPaneTab = await page.locator('.stage-pane--right .stage-tab').first();
    await rightPaneTab.click();
    await page.waitForTimeout(200);

    // Listen for the debounced PUT that contains the complete split view state.
    // Filter on the body to skip any intermediate PUTs from earlier debounce cycles.
    const putResponse = page.waitForResponse((res) => {
      if (!res.url().includes('workspace-state')) return false;
      if (res.request().method() !== 'PUT') return false;
      const body = res.request().postDataJSON();
      return body?.splitView?.enabled === true;
    }, { timeout: 8000 });
    await page.locator('.work-item').nth(3).click();
    await page.waitForTimeout(300);

    const rightPreviewTitle = await page.locator('.stage-pane--right .stage-tab--preview .stage-tab-title').textContent();
    console.log('Right preview before reload:', rightPreviewTitle);

    // Verify setup before reload
    await expect(page.locator('.stage-pane--left .stage-tab')).toHaveCount(2);
    await expect(page.locator('.stage-pane--left .stage-tab--preview')).toHaveCount(1);
    await expect(page.locator('.stage-pane--right .stage-tab')).toHaveCount(2);
    await expect(page.locator('.stage-pane--right .stage-tab--preview')).toHaveCount(1);

    // Wait for the debounced save to complete on the server, then reload
    await putResponse;
    await page.reload();
    await page.waitForSelector('.App', { timeout: 5000 });
    await page.waitForSelector('.stage-split-container', { state: 'visible', timeout: 10000 });

    // Verify both panes have tabs
    expect(await page.locator('.stage-pane--left .stage-tab').count()).toBeGreaterThan(0);
    expect(await page.locator('.stage-pane--right .stage-tab').count()).toBeGreaterThan(0);

    // Verify preview tabs survived
    const leftPreviewCount = await page.locator('.stage-pane--left .stage-tab--preview').count();
    const rightPreviewCount = await page.locator('.stage-pane--right .stage-tab--preview').count();
    expect(leftPreviewCount + rightPreviewCount).toBeGreaterThan(0);

    const actualLeftPreview = await page.locator('.stage-pane--left .stage-tab--preview .stage-tab-title').first().textContent().catch(() => null);
    const actualRightPreview = await page.locator('.stage-pane--right .stage-tab--preview .stage-tab-title').first().textContent().catch(() => null);
    console.log('Left preview after reload:', actualLeftPreview);
    console.log('Right preview after reload:', actualRightPreview);

    expect(actualLeftPreview).toBeTruthy();
    expect(actualRightPreview).toBeTruthy();
  });

  test('edge case: moving last tab from pane closes split correctly', async ({ page }) => {
    // Create split with preview in one pane
    await page.locator('.work-item').first().dblclick();
    await page.locator('.work-item').nth(1).click(); // Preview
    await page.waitForTimeout(300);

    const persistentTab = await page.locator('.stage-tab').first();
    const tabBox = await persistentTab.boundingBox();
    const stageMain = await page.locator('.stage-main');
    const stageBox = await stageMain.boundingBox();

    await page.mouse.move(tabBox.x + tabBox.width / 2, tabBox.y + tabBox.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(200);
    await page.mouse.move(tabBox.x + tabBox.width / 2 + 10, tabBox.y + tabBox.height / 2);
    await page.mouse.move(stageBox.x + stageBox.width * 0.2, stageBox.y + stageBox.height / 2);
    await page.mouse.up();

    // Verify split created
    await expect(page.locator('.stage-split-container')).toBeVisible();
    await expect(page.locator('.stage-pane--left .stage-tab')).toHaveCount(1);
    await expect(page.locator('.stage-pane--right .stage-tab--preview')).toHaveCount(1);

    // Drag the last tab from left pane to right
    const leftTab = await page.locator('.stage-pane--left .stage-tab').first();
    const leftTabBox = await leftTab.boundingBox();

    await page.mouse.move(leftTabBox.x + leftTabBox.width / 2, leftTabBox.y + leftTabBox.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(200);
    await page.mouse.move(leftTabBox.x + leftTabBox.width / 2 + 10, leftTabBox.y + leftTabBox.height / 2);
    await page.mouse.move(stageBox.x + stageBox.width * 0.8, stageBox.y + stageBox.height / 2);
    await page.mouse.up();

    // Verify split closed (left pane became empty)
    await expect(page.locator('.stage-split-container')).not.toBeVisible();
    await expect(page.locator('.stage-tabs')).toBeVisible();

    // Verify tabs are still present in single-pane mode
    await expect(page.locator('.stage-tab')).toHaveCount(2);
    // Preview should be preserved
    await expect(page.locator('.stage-tab--preview')).toHaveCount(1);
  });

  test('focus behavior: clicking active tab in inactive pane focuses pane', async ({ page }) => {
    // Create split
    await page.locator('.work-item').first().dblclick();
    await page.locator('.work-item').nth(1).dblclick();

    const firstTab = await page.locator('.stage-tab').first();
    const tabBox = await firstTab.boundingBox();
    const stageMain = await page.locator('.stage-main');
    const stageBox = await stageMain.boundingBox();

    await page.mouse.move(tabBox.x + tabBox.width / 2, tabBox.y + tabBox.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(200);
    await page.mouse.move(tabBox.x + tabBox.width / 2 + 10, tabBox.y + tabBox.height / 2);
    await page.mouse.move(stageBox.x + stageBox.width * 0.2, stageBox.y + stageBox.height / 2);
    await page.mouse.up();

    // Left pane should be active
    await expect(page.locator('.stage-pane--left')).toHaveClass(/stage-pane--active/);

    // Focus right pane
    const rightTab = await page.locator('.stage-pane--right .stage-tab').first();
    await rightTab.click();
    await expect(page.locator('.stage-pane--right')).toHaveClass(/stage-pane--active/);

    // Click the already-active tab in the inactive left pane
    const leftActiveTab = await page.locator('.stage-pane--left .stage-tab--active');
    await leftActiveTab.click();

    // Verify left pane is now focused
    await expect(page.locator('.stage-pane--left')).toHaveClass(/stage-pane--active/);
    await expect(page.locator('.stage-pane--right')).toHaveClass(/stage-pane--inactive/);
  });
});
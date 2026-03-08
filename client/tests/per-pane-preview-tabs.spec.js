import { test, expect } from '@playwright/test';
import { ensureCleanState } from './test-helpers.js';

test.describe('Per-Pane Preview Tab System', () => {
  test.beforeEach(async ({ page }) => {
    await ensureCleanState(page);
  });

  test('each pane should manage its own preview tab independently', async ({ page }) => {
    // Step 1: Open two persistent tabs (double-click both)
    await page.locator('.work-item').first().dblclick();
    await page.waitForTimeout(200);
    await page.locator('.work-item').nth(1).dblclick();
    await page.waitForTimeout(200);

    // Verify we have 2 persistent tabs (no preview)
    await expect(page.locator('.stage-tab')).toHaveCount(2);
    await expect(page.locator('.stage-tab--preview')).toHaveCount(0);

    // Step 2: Create split view
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

    // Verify split created
    await expect(page.locator('.stage-split-container')).toBeVisible();

    // Step 3: Add a preview tab to the left pane (it should be focused by default)
    await page.locator('.work-item').nth(2).click();
    await page.waitForTimeout(300);

    // Verify preview tab appears in left pane
    await expect(page.locator('.stage-pane--left .stage-tab--preview')).toHaveCount(1);
    await expect(page.locator('.stage-pane--right .stage-tab--preview')).toHaveCount(0);

    // Step 4: Focus right pane and add a preview tab there
    const rightPaneTab = await page.locator('.stage-pane--right .stage-tab').first();
    await rightPaneTab.click();
    await page.waitForTimeout(200);

    await page.locator('.work-item').nth(3).click();
    await page.waitForTimeout(300);

    // Verify each pane now has its own preview tab
    await expect(page.locator('.stage-pane--left .stage-tab--preview')).toHaveCount(1);
    await expect(page.locator('.stage-pane--right .stage-tab--preview')).toHaveCount(1);

    // Step 5: Verify both panes show their respective content
    await expect(page.locator('.stage-pane--left .stage-content-wrapper')).toBeVisible();
    await expect(page.locator('.stage-pane--right .stage-content-wrapper')).toBeVisible();
  });

  test('preview tab should become persistent when dragged to another pane', async ({ page }) => {
    // Setup: Create two tabs, one persistent and one preview
    await page.locator('.work-item').first().dblclick();
    await page.waitForTimeout(200);
    await page.locator('.work-item').nth(1).dblclick();
    await page.waitForTimeout(200);
    await page.locator('.work-item').nth(2).click(); // Preview tab
    await page.waitForTimeout(300);

    // Create split with first tab
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

    // Verify split created - right pane should have 2 tabs (1 persistent + 1 preview)
    await expect(page.locator('.stage-split-container')).toBeVisible();
    await expect(page.locator('.stage-pane--right .stage-tab')).toHaveCount(2);
    await expect(page.locator('.stage-pane--right .stage-tab--preview')).toHaveCount(1);

    // Drag the preview tab from right to left pane
    const rightPreviewTab = await page.locator('.stage-pane--right .stage-tab--preview');
    const rightTabBox = await rightPreviewTab.boundingBox();

    await page.mouse.move(rightTabBox.x + rightTabBox.width / 2, rightTabBox.y + rightTabBox.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(200);
    await page.mouse.move(rightTabBox.x + rightTabBox.width / 2 + 10, rightTabBox.y + rightTabBox.height / 2);
    await page.mouse.move(stageBox.x + stageBox.width * 0.2, stageBox.y + stageBox.height / 2);
    await page.mouse.up();

    // Verify the tab is no longer a preview (became persistent when moved)
    await expect(page.locator('.stage-pane--left .stage-tab')).toHaveCount(2);
    await expect(page.locator('.stage-pane--left .stage-tab--preview')).toHaveCount(0);
    await expect(page.locator('.stage-pane--right .stage-tab--preview')).toHaveCount(0);
  });

  test('clicking on tab should focus its pane', async ({ page }) => {
    // Create split view
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

    // Verify split created with left pane active (since we dragged there)
    await expect(page.locator('.stage-split-container')).toBeVisible();
    await expect(page.locator('.stage-pane--left')).toHaveClass(/stage-pane--active/);

    // Click on right pane tab to focus right pane
    const rightPaneTab = await page.locator('.stage-pane--right .stage-tab').first();
    await rightPaneTab.click();

    // Verify right pane is now active
    await expect(page.locator('.stage-pane--right')).toHaveClass(/stage-pane--active/);
    await expect(page.locator('.stage-pane--left')).toHaveClass(/stage-pane--inactive/);

    // Click on left pane tab to focus left pane again
    const leftPaneTab = await page.locator('.stage-pane--left .stage-tab').first();
    await leftPaneTab.click();

    // Verify left pane is now active
    await expect(page.locator('.stage-pane--left')).toHaveClass(/stage-pane--active/);
    await expect(page.locator('.stage-pane--right')).toHaveClass(/stage-pane--inactive/);
  });

  test('clicking on pane content area should focus that pane', async ({ page }) => {
    // Create split view
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

    // Left pane should be active after dragging there
    await expect(page.locator('.stage-pane--left')).toHaveClass(/stage-pane--active/);

    // Click on right pane content area (not on tab)
    const rightPane = await page.locator('.stage-pane--right .stage-content-wrapper');
    await rightPane.click();

    // Verify right pane is now active
    await expect(page.locator('.stage-pane--right')).toHaveClass(/stage-pane--active/);
    await expect(page.locator('.stage-pane--left')).toHaveClass(/stage-pane--inactive/);

    // Click on left pane content area
    const leftPane = await page.locator('.stage-pane--left .stage-content-wrapper');
    await leftPane.click();

    // Verify left pane is now active
    await expect(page.locator('.stage-pane--left')).toHaveClass(/stage-pane--active/);
    await expect(page.locator('.stage-pane--right')).toHaveClass(/stage-pane--inactive/);
  });

  test('opening new work item replaces preview in focused pane only', async ({ page }) => {
    // Setup: Create split with preview tabs in both panes
    await page.locator('.work-item').first().dblclick();
    await page.locator('.work-item').nth(1).dblclick();

    // Create split
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

    // Add preview to left pane (already focused)
    await page.locator('.work-item').nth(2).click();
    await page.waitForTimeout(300);

    // Get the left pane preview tab title
    const leftPreviewTitle = await page.locator('.stage-pane--left .stage-tab--preview .stage-tab-title').textContent();

    // Focus right pane and add preview there
    const rightPaneTab = await page.locator('.stage-pane--right .stage-tab').first();
    await rightPaneTab.click();
    await page.waitForTimeout(200);

    await page.locator('.work-item').nth(3).click();
    await page.waitForTimeout(300);

    // Get the right pane preview tab title
    const rightPreviewTitle = await page.locator('.stage-pane--right .stage-tab--preview .stage-tab-title').textContent();

    // Both panes should have preview tabs
    await expect(page.locator('.stage-pane--left .stage-tab--preview')).toHaveCount(1);
    await expect(page.locator('.stage-pane--right .stage-tab--preview')).toHaveCount(1);

    // Open new item - should replace preview in right pane (currently focused)
    await page.locator('.work-item').nth(4).click();
    await page.waitForTimeout(300);

    // Verify right pane preview was replaced, left pane preview unchanged
    await expect(page.locator('.stage-pane--left .stage-tab--preview .stage-tab-title')).toHaveText(leftPreviewTitle);
    const newRightPreviewTitle = await page.locator('.stage-pane--right .stage-tab--preview .stage-tab-title').textContent();
    expect(newRightPreviewTitle).not.toBe(rightPreviewTitle);

    // Focus left pane and open another item
    const leftPaneTabToFocus = await page.locator('.stage-pane--left .stage-tab').first();
    await leftPaneTabToFocus.click();
    await page.waitForTimeout(200);

    await page.locator('.work-item').nth(5).click();
    await page.waitForTimeout(300);

    // Verify left pane preview was replaced, right pane preview unchanged
    const newLeftPreviewTitle = await page.locator('.stage-pane--left .stage-tab--preview .stage-tab-title').textContent();
    expect(newLeftPreviewTitle).not.toBe(leftPreviewTitle);
    await expect(page.locator('.stage-pane--right .stage-tab--preview .stage-tab-title')).toHaveText(newRightPreviewTitle);
  });

  test('double-clicking preview tab makes it persistent in its pane', async ({ page }) => {
    // Create split with preview tabs
    await page.locator('.work-item').first().dblclick();
    await page.locator('.work-item').nth(1).dblclick();

    // Create split
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

    // Add preview to left pane
    await page.locator('.work-item').nth(2).click();
    await page.waitForTimeout(300);

    // Add preview to right pane
    const rightPaneTab = await page.locator('.stage-pane--right .stage-tab').first();
    await rightPaneTab.click();
    await page.waitForTimeout(200);
    await page.locator('.work-item').nth(3).click();
    await page.waitForTimeout(300);

    // Verify both panes have preview tabs
    await expect(page.locator('.stage-pane--left .stage-tab--preview')).toHaveCount(1);
    await expect(page.locator('.stage-pane--right .stage-tab--preview')).toHaveCount(1);

    // Double-click left pane preview to make it persistent
    const leftPreviewTab = await page.locator('.stage-pane--left .stage-tab--preview');
    await leftPreviewTab.dblclick();

    // Verify left preview became persistent, right still preview
    await expect(page.locator('.stage-pane--left .stage-tab--preview')).toHaveCount(0);
    await expect(page.locator('.stage-pane--left .stage-tab')).toHaveCount(2); // Both tabs persistent
    await expect(page.locator('.stage-pane--right .stage-tab--preview')).toHaveCount(1);

    // Double-click right pane preview to make it persistent
    const rightPreviewTab = await page.locator('.stage-pane--right .stage-tab--preview');
    await rightPreviewTab.dblclick();

    // Verify all tabs are now persistent
    await expect(page.locator('.stage-pane--left .stage-tab--preview')).toHaveCount(0);
    await expect(page.locator('.stage-pane--right .stage-tab--preview')).toHaveCount(0);
  });

  test('closing split preserves preview tab for single-pane mode', async ({ page }) => {
    // Create two tabs (one will be persistent, one preview)
    await page.locator('.work-item').first().dblclick();
    await page.waitForTimeout(200);
    await page.locator('.work-item').nth(1).dblclick();
    await page.waitForTimeout(200);

    // Create split
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

    // Add a preview tab to the right pane
    const rightPaneTab = await page.locator('.stage-pane--right .stage-tab').first();
    await rightPaneTab.click();
    await page.waitForTimeout(200);
    await page.locator('.work-item').nth(2).click(); // Preview
    await page.waitForTimeout(300);

    // Verify split with preview in right pane
    await expect(page.locator('.stage-split-container')).toBeVisible();
    await expect(page.locator('.stage-pane--right .stage-tab--preview')).toHaveCount(1);

    // Close the left pane tab to close split
    const leftCloseBtn = await page.locator('.stage-pane--left .stage-tab-close').first();
    await leftCloseBtn.click();

    // Verify split closed and preview tab is preserved
    await expect(page.locator('.stage-split-container')).not.toBeVisible();
    await expect(page.locator('.stage-tabs')).toBeVisible();
    await expect(page.locator('.stage-tab--preview')).toHaveCount(1);
  });
});
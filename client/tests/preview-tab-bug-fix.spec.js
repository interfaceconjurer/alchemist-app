import { test, expect } from '@playwright/test';
import { ensureCleanState } from './test-helpers.js';

test.describe('Preview Tab Split View Bug Fix', () => {
  test.beforeEach(async ({ page }) => {
    await ensureCleanState(page);
  });

  test('should add preview tab to active pane when opening new work item', async ({ page }) => {
    console.log('Starting test: add preview tab to active pane');

    // Step 1: Open first work item as persistent (double-click)
    await page.locator('.work-item').first().dblclick();
    await page.waitForTimeout(200);

    // Step 2: Open second work item as persistent (double-click)
    await page.locator('.work-item').nth(1).dblclick();
    await page.waitForTimeout(200);

    // Verify we have 2 persistent tabs
    await expect(page.locator('.stage-tab')).toHaveCount(2);
    await expect(page.locator('.stage-tab--preview')).toHaveCount(0);

    // Step 3: Create split view by dragging first tab to left pane
    const firstTab = await page.locator('.stage-tab').first();
    const tabBox = await firstTab.boundingBox();
    const stageMain = await page.locator('.stage-main');
    const stageBox = await stageMain.boundingBox();

    await page.mouse.move(tabBox.x + tabBox.width / 2, tabBox.y + tabBox.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(200);
    await page.mouse.move(tabBox.x + tabBox.width / 2 + 10, tabBox.y + tabBox.height / 2);

    // Move to left side to create split
    await page.mouse.move(stageBox.x + stageBox.width * 0.2, stageBox.y + stageBox.height / 2);
    await page.mouse.up();

    // Verify split created
    await expect(page.locator('.stage-split-container')).toBeVisible();
    await expect(page.locator('.stage-pane--left .stage-tab')).toHaveCount(1);
    await expect(page.locator('.stage-pane--right .stage-tab')).toHaveCount(1);

    console.log('Split created with persistent tabs in both panes');

    // Step 4: Left pane should be active (we just dragged there)
    await expect(page.locator('.stage-pane--left')).toHaveClass(/stage-pane--active/);
    console.log('Left pane is active');

    // Step 5: Open a new work item as preview (single click)
    // This should add a preview tab to the LEFT pane (active pane)
    const thirdWorkItem = await page.locator('.work-item').nth(2);
    const newItemTitle = await thirdWorkItem.locator('.work-item-title').textContent();
    console.log('Opening new work item:', newItemTitle);

    await thirdWorkItem.click();
    await page.waitForTimeout(300);

    // Step 6: Verify preview tab was added to LEFT pane only
    await expect(page.locator('.stage-pane--left .stage-tab--preview')).toHaveCount(1);
    await expect(page.locator('.stage-pane--right .stage-tab--preview')).toHaveCount(0);

    // Left pane should now have 2 tabs (1 persistent + 1 preview)
    await expect(page.locator('.stage-pane--left .stage-tab')).toHaveCount(2);
    await expect(page.locator('.stage-pane--right .stage-tab')).toHaveCount(1);

    // Verify the preview tab has the new item's title
    const previewTabTitle = await page.locator('.stage-pane--left .stage-tab--preview .stage-tab-title').textContent();
    expect(previewTabTitle).toBe(newItemTitle);
    console.log('Preview tab title in left pane:', previewTabTitle);

    // Step 7: Switch to right pane and add preview there
    const rightPaneTab = await page.locator('.stage-pane--right .stage-tab').first();
    await rightPaneTab.click();
    await page.waitForTimeout(200);

    await expect(page.locator('.stage-pane--right')).toHaveClass(/stage-pane--active/);

    const fourthWorkItem = await page.locator('.work-item').nth(3);
    await fourthWorkItem.click();
    await page.waitForTimeout(300);

    // Step 8: Verify each pane has its own preview tab
    await expect(page.locator('.stage-pane--left .stage-tab--preview')).toHaveCount(1);
    await expect(page.locator('.stage-pane--right .stage-tab--preview')).toHaveCount(1);

    // Verify content is visible in both panes
    const leftContent = await page.locator('.stage-pane--left .stage-content-wrapper');
    const rightContent = await page.locator('.stage-pane--right .stage-content-wrapper');

    await expect(leftContent).toBeVisible();
    await expect(rightContent).toBeVisible();

    console.log('Test passed: Each pane manages its own preview tab');
  });

  test('should replace preview tab in active pane when opening new work item', async ({ page }) => {
    console.log('Starting test: replace preview tab in active pane');

    // Step 1: Open three persistent tabs first
    await page.locator('.work-item').first().dblclick();
    await page.waitForTimeout(200);
    await page.locator('.work-item').nth(1).dblclick();
    await page.waitForTimeout(200);
    await page.locator('.work-item').nth(2).dblclick();
    await page.waitForTimeout(200);

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

    // Verify split created
    await expect(page.locator('.stage-split-container')).toBeVisible();
    await expect(page.locator('.stage-pane--left .stage-tab')).toHaveCount(1);
    await expect(page.locator('.stage-pane--right .stage-tab')).toHaveCount(2);

    // Left pane is active - add a preview tab there
    await page.locator('.work-item').nth(3).click();
    await page.waitForTimeout(300);

    const firstPreviewTitle = await page.locator('.stage-pane--left .stage-tab--preview .stage-tab-title').textContent();
    console.log('First preview in left pane:', firstPreviewTitle);

    // Verify preview in left pane only
    await expect(page.locator('.stage-pane--left .stage-tab--preview')).toHaveCount(1);
    await expect(page.locator('.stage-pane--right .stage-tab--preview')).toHaveCount(0);

    // Step 2: Click on RIGHT pane to make it active
    const rightPaneTab = await page.locator('.stage-pane--right .stage-tab').first();
    await rightPaneTab.click();
    await page.waitForTimeout(200);

    // Add preview to right pane
    await page.locator('.work-item').nth(4).click();
    await page.waitForTimeout(300);

    const rightPreviewTitle = await page.locator('.stage-pane--right .stage-tab--preview .stage-tab-title').textContent();
    console.log('First preview in right pane:', rightPreviewTitle);

    // Now both panes have preview tabs
    await expect(page.locator('.stage-pane--left .stage-tab--preview')).toHaveCount(1);
    await expect(page.locator('.stage-pane--right .stage-tab--preview')).toHaveCount(1);

    // Step 3: Open new work item - should replace preview in active (right) pane only
    const sixthWorkItem = await page.locator('.work-item').nth(5);
    const newItemTitle = await sixthWorkItem.locator('.work-item-title').textContent();

    await sixthWorkItem.click();
    await page.waitForTimeout(300);

    // Step 4: Verify preview tab was replaced in right pane only
    await expect(page.locator('.stage-pane--right .stage-tab--preview')).toHaveCount(1);
    const newPreviewTitle = await page.locator('.stage-pane--right .stage-tab--preview .stage-tab-title').textContent();
    expect(newPreviewTitle).toBe(newItemTitle);

    // Left pane preview should be unchanged
    await expect(page.locator('.stage-pane--left .stage-tab--preview .stage-tab-title')).toHaveText(firstPreviewTitle);

    // Verify tabs are visible (use first() since there may be multiple)
    await expect(page.locator('.stage-pane--left .stage-tab-title').first()).toBeVisible();
    await expect(page.locator('.stage-pane--right .stage-tab-title').first()).toBeVisible();

    console.log('Test passed: Preview tab correctly replaced in active pane only');
  });

  test('should handle closing split view with preview tab', async ({ page }) => {
    console.log('Starting test: close split view with preview tab');

    // Setup: Create split with preview tab
    await page.locator('.work-item').first().dblclick();
    await page.locator('.work-item').nth(1).click();
    await page.waitForTimeout(300);

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

    // Verify split created
    await expect(page.locator('.stage-split-container')).toBeVisible();

    // Open new item to replace preview
    await page.locator('.work-item').nth(2).click();
    await page.waitForTimeout(300);

    // Close all tabs in left pane to close split
    const leftCloseBtn = await page.locator('.stage-pane--left .stage-tab-close').first();
    await leftCloseBtn.click();

    // Verify split closed and tabs are visible
    await expect(page.locator('.stage-split-container')).not.toBeVisible();
    await expect(page.locator('.stage-tabs')).toBeVisible();

    const finalTabs = await page.locator('.stage-tab').count();
    expect(finalTabs).toBeGreaterThan(0);

    // Preview tab should still exist
    await expect(page.locator('.stage-tab--preview')).toHaveCount(1);

    console.log('Test passed: Split view closed correctly with preview tab preserved');
  });
});
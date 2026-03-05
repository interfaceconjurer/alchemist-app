import { test, expect } from '@playwright/test';
import { ensureCleanState } from './test-helpers.js';

test.describe('Per-Pane Preview Tabs', () => {
  test.beforeEach(async ({ page }) => {
    await ensureCleanState(page);
  });

  test('should handle preview tab correctly in split view when opening new workitem', async ({ page }) => {
    // Step 1: Open first work item as persistent (double-click)
    await page.locator('.work-item').first().dblclick();
    await page.waitForTimeout(200);

    // Step 2: Open second work item as preview (single-click)
    await page.locator('.work-item').nth(1).click();
    await page.waitForTimeout(300); // Single click has 250ms delay

    // Verify we have 2 tabs, one should be preview (italicized)
    await expect(page.locator('.stage-tab')).toHaveCount(2);
    await expect(page.locator('.stage-tab--preview')).toHaveCount(1);

    // Step 3: Create split view by dragging first tab to left
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
    await expect(page.locator('.stage-pane--left')).toBeVisible();
    await expect(page.locator('.stage-pane--right')).toBeVisible();

    // Verify tabs are visible in both panes
    const leftPaneTabs = await page.locator('.stage-pane--left .stage-tab');
    const rightPaneTabs = await page.locator('.stage-pane--right .stage-tab');

    console.log('Left pane tabs:', await leftPaneTabs.count());
    console.log('Right pane tabs:', await rightPaneTabs.count());

    // One of the panes should have a preview tab
    const previewInLeft = await page.locator('.stage-pane--left .stage-tab--preview').count();
    const previewInRight = await page.locator('.stage-pane--right .stage-tab--preview').count();
    console.log('Preview in left:', previewInLeft, 'Preview in right:', previewInRight);

    // Step 4: Click on the pane with the preview tab to focus it
    let focusedPane;
    if (previewInRight > 0) {
      // Focus right pane by clicking a tab in it
      const rightTab = await page.locator('.stage-pane--right .stage-tab').first();
      await rightTab.click();
      focusedPane = 'right';
    } else if (previewInLeft > 0) {
      // Focus left pane by clicking a tab in it
      const leftTab = await page.locator('.stage-pane--left .stage-tab').first();
      await leftTab.click();
      focusedPane = 'left';
    }
    await page.waitForTimeout(200);

    // Step 5: Open a new work item (single click for preview)
    console.log('Opening third work item as preview in', focusedPane, 'pane');
    await page.locator('.work-item').nth(2).click();
    await page.waitForTimeout(300);

    // THIS IS WHERE THE BUG OCCURS
    // Verify tabs are still visible and not blank
    const leftPaneTabsAfter = await page.locator('.stage-pane--left .stage-tab');
    const rightPaneTabsAfter = await page.locator('.stage-pane--right .stage-tab');

    console.log('After opening new item - Left pane tabs:', await leftPaneTabsAfter.count());
    console.log('After opening new item - Right pane tabs:', await rightPaneTabsAfter.count());

    // Check if tabs are visible (not blank)
    await expect(leftPaneTabsAfter.first()).toBeVisible();
    await expect(rightPaneTabsAfter.first()).toBeVisible();

    // Check if content is visible in at least one pane
    const leftContent = await page.locator('.stage-pane--left .stage-content-wrapper');
    const rightContent = await page.locator('.stage-pane--right .stage-content-wrapper');

    const leftContentVisible = await leftContent.isVisible().catch(() => false);
    const rightContentVisible = await rightContent.isVisible().catch(() => false);

    console.log('Left content visible:', leftContentVisible);
    console.log('Right content visible:', rightContentVisible);

    // At least one pane should show content
    expect(leftContentVisible || rightContentVisible).toBeTruthy();

    // The new tab should appear in the focused pane
    if (focusedPane === 'right') {
      // Should have replaced the preview tab in right pane
      const rightPanePreviewCount = await page.locator('.stage-pane--right .stage-tab--preview').count();
      expect(rightPanePreviewCount).toBe(1); // Still a preview tab
    } else {
      // Should have replaced the preview tab in left pane
      const leftPanePreviewCount = await page.locator('.stage-pane--left .stage-tab--preview').count();
      expect(leftPanePreviewCount).toBe(1); // Still a preview tab
    }

    // Step 6: Close split view by removing all tabs from one pane
    console.log('Closing split view...');
    const closeButtons = await page.locator(`.stage-pane--${focusedPane} .stage-tab-close`).all();
    for (const btn of closeButtons) {
      await btn.click();
      await page.waitForTimeout(100);
    }

    // Verify split is closed and tab appears on stage
    await expect(page.locator('.stage-split-container')).not.toBeVisible();
    await expect(page.locator('.stage-tabs')).toBeVisible();

    // Should still have tabs visible in single pane mode
    const finalTabs = await page.locator('.stage-tab').count();
    console.log('Final tab count after closing split:', finalTabs);
    expect(finalTabs).toBeGreaterThan(0);
  });

  test('should work correctly when both tabs are persistent in split view', async ({ page }) => {
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

    // Step 3: Focus right pane and open new tab
    const rightPaneTab = await page.locator('.stage-pane--right .stage-tab').first();
    await rightPaneTab.click();
    await page.waitForTimeout(200);

    // Open a new work item as persistent
    await page.locator('.work-item').nth(2).dblclick();
    await page.waitForTimeout(200);

    // Verify new tab appears correctly in right pane
    const rightPaneTabs = await page.locator('.stage-pane--right .stage-tab');
    await expect(rightPaneTabs).toHaveCount(2);

    // Verify content is visible
    await expect(page.locator('.stage-pane--right .stage-content-wrapper')).toBeVisible();
    await expect(page.locator('.stage-pane--left .stage-content-wrapper')).toBeVisible();
  });
});
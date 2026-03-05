import { test, expect } from '@playwright/test';

// These tests can start failing when (1) more specs run in parallel and leave tabs/split state,
// or (2) the app loads state from the server (Vite proxies /api to Express): clearing only
// localStorage then reloading still yields server state. beforeEach clears storage, resets server
// state when the API is available, and closes any remaining tabs without using stale refs.

test.describe('Split View Tab System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173?test=' + Date.now());

    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Reset server state so reload gives a clean slate (no-op if only Vite is running)
    try {
      await page.request.put('http://localhost:5173/api/workspace-state', {
        data: { openTabIds: [], activeTabId: null },
        timeout: 2000,
      });
    } catch {
      // Server not available (e.g. only npm start / Vite)
    }

    await page.reload();

    // Wait for the app to load
    await page.waitForSelector('.App', { timeout: 5000 });
    await page.waitForSelector('.left-panel', { timeout: 5000 });

    // Close any existing tabs by always re-querying the first close button (avoids stale refs after DOM updates)
    const existingTabs = await page.locator('.stage-tab').count();
    if (existingTabs > 0 && existingTabs <= 8) {
      const maxCloseAttempts = Math.min(existingTabs + 2, 10);
      for (let i = 0; i < maxCloseAttempts; i++) {
        const closeBtn = page.locator('.stage-tab-close').first();
        if ((await closeBtn.count()) === 0) break;
        await closeBtn.click({ timeout: 3000 }).catch(() => {});
        await page.waitForTimeout(150);
      }
    } else if (existingTabs > 8) {
      await page.reload();
      await page.waitForSelector('.App', { timeout: 5000 });
    }

    await page.waitForTimeout(200);
  });

  test('should open work items as tabs', async ({ page }) => {
    // Start fresh - reload page to ensure clean state
    await page.reload();
    await page.waitForSelector('.App', { timeout: 5000 });
    await page.waitForTimeout(500);

    // Check initial state and clean up if needed
    const initialTabs = await page.locator('.stage-tab').count();
    console.log('Initial tab count:', initialTabs);

    // If there are tabs, they're from previous tests - close them
    if (initialTabs > 0) {
      // Close all existing tabs
      for (let i = 0; i < initialTabs; i++) {
        const closeBtn = await page.locator('.stage-tab-close').first();
        if (await closeBtn.isVisible()) {
          await closeBtn.click();
          await page.waitForTimeout(100);
        }
      }
      // Verify all tabs are closed
      await expect(page.locator('.stage-tab')).toHaveCount(0);
    }

    // Now test opening new tabs
    // Double-click on first work item for persistent tab
    const firstWorkItem = await page.locator('.work-item').first();
    await firstWorkItem.dblclick();
    await page.waitForTimeout(300);

    // Verify we have exactly one tab
    await expect(page.locator('.stage-tab')).toHaveCount(1);

    // Double-click on second work item for persistent tab
    const secondWorkItem = await page.locator('.work-item').nth(1);
    await secondWorkItem.dblclick();
    await page.waitForTimeout(300);

    // Verify we have exactly two tabs
    await expect(page.locator('.stage-tab')).toHaveCount(2);
  });

  test('should create split view when dragging tab to left/right', async ({ page }) => {
    // Ensure no split view exists
    const splitExists = await page.locator('.stage-split-container').count();
    if (splitExists > 0) {
      for (let i = 0; i < 10; i++) {
        const closeBtn = page.locator('.stage-tab-close').first();
        if ((await closeBtn.count()) === 0) break;
        await closeBtn.click({ timeout: 3000 }).catch(() => {});
        await page.waitForTimeout(150);
      }
    }

    // Open two tabs first (double-click for persistent tabs)
    await page.locator('.work-item').first().dblclick();
    await page.waitForTimeout(200);
    await page.locator('.work-item').nth(1).dblclick();
    await page.waitForTimeout(200);

    // Get the first tab
    const firstTab = await page.locator('.stage-tab').first();
    const tabBox = await firstTab.boundingBox();

    // Get stage area for drop target
    const stageMain = await page.locator('.stage-main');
    const stageBox = await stageMain.boundingBox();

    // Start drag from tab center
    await page.mouse.move(tabBox.x + tabBox.width / 2, tabBox.y + tabBox.height / 2);
    await page.mouse.down();

    // Wait for drag threshold (150ms)
    await page.waitForTimeout(200);

    // Move 10px to trigger drag
    await page.mouse.move(tabBox.x + tabBox.width / 2 + 10, tabBox.y + tabBox.height / 2);

    // Verify ghost element appears
    await expect(page.locator('.stage-drag-ghost')).toBeVisible();

    // Move to left third of stage to trigger split
    await page.mouse.move(stageBox.x + stageBox.width * 0.2, stageBox.y + stageBox.height / 2);

    // Verify drop zone appears
    await expect(page.locator('.stage-drop-zone')).toBeVisible();
    await expect(page.locator('.stage-drop-zone-label')).toContainText('Drop to split left');

    // Drop the tab
    await page.mouse.up();

    // Verify split view is created
    await expect(page.locator('.stage-split-container')).toBeVisible();
    await expect(page.locator('.stage-pane--left')).toBeVisible();
    await expect(page.locator('.stage-pane--right')).toBeVisible();
    await expect(page.locator('.stage-splitter')).toBeVisible();
  });

  test('should show only one drop zone at a time based on cursor position', async ({ page }) => {
    await page.reload();
    await page.waitForSelector('.App', { timeout: 5000 });
    await page.waitForTimeout(500);

    for (let i = 0; i < 10; i++) {
      const closeBtn = page.locator('.stage-tab-close').first();
      if ((await closeBtn.count()) === 0) break;
      await closeBtn.click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(150);
    }

    // Open two tabs
    await page.locator('.work-item').first().dblclick();
    await page.waitForTimeout(200);
    await page.locator('.work-item').nth(1).dblclick();
    await page.waitForTimeout(200);

    // Start dragging
    const firstTab = await page.locator('.stage-tab').first();
    const tabBox = await firstTab.boundingBox();
    const stageMain = await page.locator('.stage-main');
    const stageBox = await stageMain.boundingBox();

    await page.mouse.move(tabBox.x + tabBox.width / 2, tabBox.y + tabBox.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(200);
    await page.mouse.move(tabBox.x + tabBox.width / 2 + 10, tabBox.y + tabBox.height / 2);

    // Move to left side
    await page.mouse.move(stageBox.x + stageBox.width * 0.2, stageBox.y + stageBox.height / 2);
    await expect(page.locator('.stage-drop-zone')).toHaveCount(1);
    await expect(page.locator('.stage-drop-zone-label')).toContainText('Drop to split left');

    // Move to right side
    await page.mouse.move(stageBox.x + stageBox.width * 0.8, stageBox.y + stageBox.height / 2);
    await expect(page.locator('.stage-drop-zone')).toHaveCount(1);
    await expect(page.locator('.stage-drop-zone-label')).toContainText('Drop to split right');

    await page.mouse.up();
  });

  test('should move tabs between panes in split view', async ({ page }) => {
    // Create split view first
    await page.locator('.work-item').first().dblclick();
    await page.locator('.work-item').nth(1).dblclick();
    await page.locator('.work-item').nth(2).dblclick();

    // Create split by dragging first tab to left
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

    // Now drag a tab from right pane to left pane
    const rightPaneTabs = await page.locator('.stage-pane--right .stage-tab');
    const rightTab = await rightPaneTabs.first();
    const rightTabBox = await rightTab.boundingBox();

    await page.mouse.move(rightTabBox.x + rightTabBox.width / 2, rightTabBox.y + rightTabBox.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(200);
    await page.mouse.move(rightTabBox.x + rightTabBox.width / 2 + 10, rightTabBox.y + rightTabBox.height / 2);

    // Move to left pane
    await page.mouse.move(stageBox.x + stageBox.width * 0.2, stageBox.y + stageBox.height / 2);
    await expect(page.locator('.stage-drop-zone-label')).toContainText('Drop in left pane');

    await page.mouse.up();

    // Verify tab moved to left pane
    const leftPaneTabs = await page.locator('.stage-pane--left .stage-tab');
    await expect(leftPaneTabs).toHaveCount(2);
  });

  test('should resize splitter between panes', async ({ page }) => {
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

    // Get splitter
    const splitter = await page.locator('.stage-splitter');
    const splitterBox = await splitter.boundingBox();

    // Drag splitter to resize
    await page.mouse.move(splitterBox.x + splitterBox.width / 2, splitterBox.y + splitterBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(splitterBox.x + 100, splitterBox.y + splitterBox.height / 2);
    await page.mouse.up();

    // Verify panes resized (check computed styles)
    const leftPane = await page.locator('.stage-pane--left');
    const leftPaneWidth = await leftPane.evaluate(el => el.style.width);
    expect(parseInt(leftPaneWidth)).toBeGreaterThan(50);
  });

  test('should close split when last tab removed from pane', async ({ page }) => {
    // Create split view with 2 tabs
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

    // Verify split created
    await expect(page.locator('.stage-split-container')).toBeVisible();

    // Close the tab in left pane
    const leftPaneCloseButton = await page.locator('.stage-pane--left .stage-tab-close').first();
    await leftPaneCloseButton.click();

    // Verify split is closed
    await expect(page.locator('.stage-split-container')).not.toBeVisible();
    await expect(page.locator('.stage-tabs')).toBeVisible();
  });

  test('should show each pane with its own active tab', async ({ page }) => {
    // Open 3 tabs
    await page.locator('.work-item').first().dblclick();
    await page.locator('.work-item').nth(1).dblclick();
    await page.locator('.work-item').nth(2).dblclick();

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

    // Click a tab in right pane
    const rightPaneTab = await page.locator('.stage-pane--right .stage-tab').first();
    await rightPaneTab.click();

    // Verify both panes show content
    await expect(page.locator('.stage-pane--left .stage-content-wrapper')).toBeVisible();
    await expect(page.locator('.stage-pane--right .stage-content-wrapper')).toBeVisible();

    // Verify active tabs in each pane
    await expect(page.locator('.stage-pane--left .stage-tab--active')).toHaveCount(1);
    await expect(page.locator('.stage-pane--right .stage-tab--active')).toHaveCount(1);
  });

  test('should open new work items in focused pane', async ({ page }) => {
    // Open 2 tabs and create split
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

    // Wait for split to be created
    await page.waitForSelector('.stage-split-container');

    // Left pane should be focused (since we dragged there)
    await expect(page.locator('.stage-pane--left')).toHaveClass(/stage-pane--active/);

    // Click on right pane tab to focus it
    const rightPaneTab = await page.locator('.stage-pane--right .stage-tab').first();
    await rightPaneTab.click();
    await page.waitForTimeout(200);

    // Verify right pane is now active
    await expect(page.locator('.stage-pane--right')).toHaveClass(/stage-pane--active/);

    // Open a new work item (persistent with double-click)
    await page.locator('.work-item').nth(2).dblclick();
    await page.waitForTimeout(200);

    // Verify new tab appears in right pane
    const rightPaneTabs = await page.locator('.stage-pane--right .stage-tab');
    await expect(rightPaneTabs).toHaveCount(2);

    // Click on left pane tab to focus it
    const leftPaneTabForFocus = await page.locator('.stage-pane--left .stage-tab').first();
    await leftPaneTabForFocus.click();
    await page.waitForTimeout(200);

    // Verify left pane is now active
    await expect(page.locator('.stage-pane--left')).toHaveClass(/stage-pane--active/);

    // Open another work item
    await page.locator('.work-item').nth(3).dblclick();
    await page.waitForTimeout(200);

    // Verify new tab appears in left pane
    const leftPaneTabs = await page.locator('.stage-pane--left .stage-tab');
    await expect(leftPaneTabs).toHaveCount(2);
  });

  test('should persist split view state on reload', async ({ page }) => {
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

    // Wait for split to be created
    await page.waitForSelector('.stage-split-container');

    // Wait for state to save (debounce is 500ms)
    await page.waitForTimeout(1000);

    // Check localStorage before reload
    const stateBefore = await page.evaluate(() => localStorage.getItem('workspace-state'));
    console.log('State before reload:', stateBefore);

    // Reload page
    await page.reload();

    // Wait for app to load with state
    await page.waitForSelector('.App', { timeout: 5000 });
    await page.waitForTimeout(1000);

    // Check if split view is restored
    const splitContainer = await page.locator('.stage-split-container');
    const isVisible = await splitContainer.isVisible();

    if (!isVisible) {
      // Log what we have instead
      const stateAfter = await page.evaluate(() => localStorage.getItem('workspace-state'));
      console.log('State after reload:', stateAfter);
      console.log('Split container not visible after reload');
    }

    // Verify split view is restored
    await expect(page.locator('.stage-split-container')).toBeVisible();
    await expect(page.locator('.stage-pane--left')).toBeVisible();
    await expect(page.locator('.stage-pane--right')).toBeVisible();
  });
});
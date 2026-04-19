// Shared test helper functions

export async function cleanupTabs(page) {
  // More robust tab cleanup
  try {
    // Close all tabs one by one
    let tabCount = await page.locator('.stage-tab').count();
    while (tabCount > 0) {
      const closeBtn = await page.locator('.stage-tab-close').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
        await page.waitForTimeout(100);
      } else {
        break;
      }
      tabCount = await page.locator('.stage-tab').count();
    }
  } catch (e) {
    console.log('Tab cleanup error:', e.message);
  }
}

export async function ensureCleanState(page) {
  // Navigate to the app with a cache-busting parameter to force clean state
  await page.goto('/?test=' + Date.now());

  // Clear localStorage and sessionStorage
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  // Reload to get clean state
  await page.reload();

  // Wait for the app to load
  await page.waitForSelector('.App', { timeout: 5000 });
  await page.waitForSelector('.left-panel', { timeout: 5000 });

  // Clean up any existing tabs
  await cleanupTabs(page);

  // Wait for any animations to complete
  await page.waitForTimeout(200);

  // Verify clean state
  const finalTabCount = await page.locator('.stage-tab').count();
  if (finalTabCount > 0) {
    console.warn(`Warning: ${finalTabCount} tabs still present after cleanup`);
  }
}
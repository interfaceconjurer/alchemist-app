import { test, expect } from "@playwright/test";

test.describe("Debug Split View", () => {
  test("check if app loads and tabs work", async ({ page }) => {
    // Navigate and wait for app
    await page.goto("/");

    // Take screenshot of initial state
    await page.screenshot({ path: "test-results/images/debug-initial.png" });

    // Wait for work items to be present
    await page.waitForSelector(".work-item", { timeout: 10000 });

    // Log how many work items we found
    const workItems = await page.locator(".work-item").count();
    console.log(`Found ${workItems} work items`);

    // Click first work item
    await page.locator(".work-item").first().click();
    await page.waitForTimeout(1000);

    // Take screenshot after first click
    await page.screenshot({ path: "test-results/images/debug-after-first-click.png" });

    // Check if tab appeared
    const tabs = await page.locator(".stage-tab").count();
    console.log(`Found ${tabs} tabs after first click`);

    // Click second work item
    await page.locator(".work-item").nth(1).click();
    await page.waitForTimeout(1000);

    // Take screenshot after second click
    await page.screenshot({ path: "test-results/images/debug-after-second-click.png" });

    // Check tabs again
    const tabsAfterSecond = await page.locator(".stage-tab").count();
    console.log(`Found ${tabsAfterSecond} tabs after second click`);

    // Log tab titles
    const tabTitles = await page.locator(".stage-tab-title").allTextContents();
    console.log("Tab titles:", tabTitles);

    // Test drag and drop
    const firstTab = await page.locator(".stage-tab").first();
    const stageMain = await page.locator(".stage-main");

    const tabBox = await firstTab.boundingBox();
    const stageBox = await stageMain.boundingBox();

    if (tabBox && stageBox) {
      console.log("Starting drag test...");

      // Start drag
      await page.mouse.move(tabBox.x + tabBox.width / 2, tabBox.y + tabBox.height / 2);
      await page.mouse.down();

      // Wait for threshold
      await page.waitForTimeout(200);

      // Move to trigger drag
      await page.mouse.move(tabBox.x + tabBox.width / 2 + 10, tabBox.y + tabBox.height / 2);
      await page.waitForTimeout(100);

      // Check for ghost element
      const ghostExists = (await page.locator(".stage-drag-ghost").count()) > 0;
      console.log("Ghost element exists?", ghostExists);

      // Move to drop zone
      await page.mouse.move(stageBox.x + stageBox.width * 0.2, stageBox.y + stageBox.height / 2);
      await page.waitForTimeout(100);

      // Check for drop zone
      const dropZoneExists = (await page.locator(".stage-drop-zone").count()) > 0;
      console.log("Drop zone exists?", dropZoneExists);

      // Take screenshot during drag
      await page.screenshot({ path: "test-results/images/debug-during-drag.png" });

      // Drop
      await page.mouse.up();
      await page.waitForTimeout(500);

      // Check for split container
      const splitExists = (await page.locator(".stage-split-container").count()) > 0;
      console.log("Split container exists?", splitExists);

      // Final screenshot
      await page.screenshot({ path: "test-results/images/debug-after-drop.png" });
    }
  });
});

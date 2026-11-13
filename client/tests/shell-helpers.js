import { expect } from '@playwright/test';
import { SHOW_TOP_BAR } from '../src/featureFlags.js';

export { SHOW_TOP_BAR };

const SEARCH_PLACEHOLDER = 'Search work items and actions...';

// Opens the command palette through the top bar when it is shown, otherwise
// through the Cmd/Ctrl+K shortcut that stays available while it is hidden.
export async function openSearch(page, { tap = false } = {}) {
  if (SHOW_TOP_BAR) {
    const button = page.getByRole('button', { name: 'Search', exact: true });
    await (tap ? button.tap() : button.click());
  } else {
    await page.keyboard.press('ControlOrMeta+k');
  }
  const input = page.getByPlaceholder(SEARCH_PLACEHOLDER);
  await expect(input).toBeVisible();
  await expect(input).toBeFocused();
  // The palette clears its previous query after opening; filling before that
  // lands can be swallowed when the new text matches the stale query.
  await expect(input).toHaveValue('');
  return input;
}

// Flips the theme through the top-bar toggle when it is shown, otherwise
// through the command palette's Toggle Dark Mode action.
export async function toggleTheme(page, { tap = false } = {}) {
  if (SHOW_TOP_BAR) {
    const button = page.getByRole('button', { name: /Switch to .* mode/ });
    await (tap ? button.tap() : button.click());
    return;
  }
  const input = await openSearch(page, { tap });
  await input.fill('toggle dark');
  await expect(page.locator('.command-palette-item')).toHaveCount(1);
  await input.press('Enter');
  await expect(page.locator('.command-palette')).toHaveCount(0);
}

import { expect, test } from '@playwright/test';
import { readSave } from './helpers';

test('theme switch applies immediately and persists across reloads', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-testid="settings-btn"]').click();
  await expect(page.locator('[data-testid="settings-modal"]')).toBeVisible();

  await page.locator('.segment[data-setting="theme"] .seg-btn[data-value="dark"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const save = await readSave(page);
  expect(save.settings.theme).toBe('dark');
});

test('language switch to English re-renders the UI', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-testid="settings-btn"]').click();
  await page.locator('.segment[data-setting="lang"] .seg-btn[data-value="en"]').click();
  await page.locator('[data-testid="close-settings"]').click();
  await expect(page.getByText('Continue', { exact: true })).toBeVisible();
  await expect(page.getByText('Daily puzzle')).toBeVisible();
});

test('assist mode marks correctly placed tiles', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-testid="settings-btn"]').click();
  await page.locator('.switch[data-setting="assist"]').click();
  await page.locator('[data-testid="close-settings"]').click();

  await page.goto('/#/play/0/0');
  await page.waitForSelector('.board[data-state="ready"]');
  // Shuffles are derangements: no movable tile starts correct, so no markers yet.
  await expect(page.locator('.tile.correct')).toHaveCount(0);

  // Fix one tile: tap a misplaced tile, then the occupant of its home cell.
  const tiles = await page.$$eval('.tile', (els) =>
    els.map((el) => ({
      tile: Number((el as HTMLElement).dataset.tile),
      cell: Number((el as HTMLElement).dataset.cell),
      anchor: (el as HTMLElement).dataset.anchor === '1'
    }))
  );
  const wrong = tiles.find((t) => !t.anchor && t.tile !== t.cell)!;
  const partner = tiles.find((t) => t.cell === wrong.tile)!;
  await page.locator(`.tile[data-tile="${wrong.tile}"]`).click();
  await page.locator(`.tile[data-tile="${partner.tile}"]`).click();
  expect(await page.locator('.tile.correct').count()).toBeGreaterThanOrEqual(1);
});

test('progress reset requires confirmation and wipes the save', async ({ page }) => {
  await page.goto('/#/play/0/0');
  const { solveBoard } = await import('./helpers');
  await solveBoard(page);
  await page.locator('[data-testid="win-home"], [data-testid="win-list"]').first().click();

  await page.goto('/');
  await page.locator('[data-testid="settings-btn"]').click();
  await page.locator('[data-testid="reset-btn"]').click(); // arm
  await page.locator('[data-testid="reset-btn"]').click(); // confirm
  const save = await readSave(page);
  expect(save.stats.levelsCompleted).toBe(0);
  expect(save.hints).toBe(10);
});

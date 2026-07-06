import { expect, test } from '@playwright/test';
import { boardReady, readSave } from './helpers';

test('hint highlights a swap pair and costs one token', async ({ page }) => {
  await page.goto('/#/play/0/0');
  await boardReady(page);
  await expect(page.locator('[data-testid="hint-count"]')).toHaveText('10');

  await page.locator('[data-testid="hint-btn"]').click();
  await expect(page.locator('.tile.hint-from')).toHaveCount(1);
  await expect(page.locator('.tile.hint-to')).toHaveCount(1);
  await expect(page.locator('[data-testid="hint-count"]')).toHaveText('9');

  // The highlighted target tile sits on the home cell of the highlighted wrong tile.
  const fromTile = await page.locator('.tile.hint-from').getAttribute('data-tile');
  const toCell = await page.locator('.tile.hint-to').getAttribute('data-cell');
  expect(toCell).toBe(fromTile);

  const save = await readSave(page);
  expect(save.hints).toBe(9);
});

test('hint highlight clears after the next swap', async ({ page }) => {
  await page.goto('/#/play/0/0');
  await boardReady(page);
  await page.locator('[data-testid="hint-btn"]').click();
  await expect(page.locator('.tile.hint-from')).toHaveCount(1);
  // Perform the suggested swap by tapping the two highlighted tiles.
  await page.locator('.tile.hint-from').click();
  await page.locator('.tile.hint-to').click();
  await expect(page.locator('.tile.hint-from')).toHaveCount(0);
  await expect(page.locator('.tile.hint-to')).toHaveCount(0);
});

test('with zero tokens the hint button shows a toast instead', async ({ page }) => {
  await page.addInitScript(() => {
    const save = JSON.parse(JSON.stringify({
      version: 1,
      hints: 0,
      settings: { sound: false, theme: 'system', lang: 'auto', assist: false },
      packs: {},
      inProgress: {},
      daily: { lastDate: null, streak: 0, total: 0 },
      stats: { levelsCompleted: 0, totalMoves: 0, totalStars: 0, zenCompleted: 0 },
      lastPlayed: null
    }));
    window.localStorage.setItem('chromaflow.v1', JSON.stringify(save));
  });
  await page.goto('/#/play/0/0');
  await boardReady(page);
  await page.locator('[data-testid="hint-btn"]').click();
  await expect(page.locator('.toast')).toBeVisible();
  await expect(page.locator('.tile.hint-from')).toHaveCount(0);
});

test('peek shows the solution while held and hides on release', async ({ page }) => {
  await page.goto('/#/play/0/0');
  await boardReady(page);
  const peek = page.locator('.peek');
  await expect(peek).toHaveAttribute('data-peek', '0');

  const btn = page.locator('[data-testid="peek-btn"]');
  await btn.hover();
  await page.mouse.down();
  await expect(peek).toHaveAttribute('data-peek', '1');
  await page.mouse.up();
  await expect(peek).toHaveAttribute('data-peek', '0');
});

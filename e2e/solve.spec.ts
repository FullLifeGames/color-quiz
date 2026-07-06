import { expect, test } from '@playwright/test';
import { readSave, solveBoard } from './helpers';

test('solving level 1 optimally earns 3 stars, saves progress and rewards a hint', async ({ page }) => {
  await page.goto('/#/play/0/0');
  const moves = await solveBoard(page);
  expect(moves).toBeGreaterThan(0);

  const overlay = page.locator('[data-testid="win-overlay"]');
  await expect(overlay).toBeVisible();
  // Optimal play = par ⇒ 3 stars.
  await expect(page.locator('[data-testid="win-stars"]')).toHaveAttribute('data-stars', '3');
  await expect(page.locator('[data-testid="win-moves"]')).toContainText(String(moves));

  const save = await readSave(page);
  expect(save.packs['0']['0'].stars).toBe(3);
  expect(save.packs['0']['0'].bestMoves).toBe(moves);
  expect(save.stats.levelsCompleted).toBe(1);
  expect(save.hints).toBe(11); // 10 start + 1 reward
  expect(save.inProgress['p0-l0']).toBeUndefined();
});

test('"Weiter" continues to the next level', async ({ page }) => {
  await page.goto('/#/play/0/0');
  await solveBoard(page);
  await page.locator('[data-testid="win-next"]').click();
  await expect(page).toHaveURL(/#\/play\/0\/1/);
  await expect(page.locator('.board')).toBeVisible();
});

test('moves counter counts up and restart resets the board', async ({ page }) => {
  await page.goto('/#/play/0/0');
  const { makeSwaps } = await import('./helpers');
  await makeSwaps(page, 2);
  await expect(page.locator('[data-testid="moves"]')).toHaveText('2');

  // Restart needs a confirming second tap.
  await page.locator('[data-testid="restart-btn"]').click();
  await expect(page.locator('[data-testid="moves"]')).toHaveText('2');
  await page.locator('[data-testid="restart-btn"]').click();
  await expect(page.locator('[data-testid="moves"]')).toHaveText('0');
});

test('completed level shows stars in the level list', async ({ page }) => {
  await page.goto('/#/play/0/0');
  await solveBoard(page);
  await page.locator('[data-testid="win-list"]').click();
  const done = page.locator('[data-testid="level-btn"][data-level="0"]');
  await expect(done).toHaveClass(/done/);
  await expect(done.locator('.star.on')).toHaveCount(3);
});

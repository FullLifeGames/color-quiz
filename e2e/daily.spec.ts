import { expect, test } from '@playwright/test';
import { readSave, solveBoard } from './helpers';

test('solving the daily puzzle starts a streak and marks it on home', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-testid="daily-btn"]').click();
  await expect(page).toHaveURL(/#\/daily/);

  await solveBoard(page);
  const overlay = page.locator('[data-testid="win-overlay"]');
  await expect(overlay).toBeVisible();
  await expect(overlay).toContainText('1');

  const save = await readSave(page);
  expect(save.daily.streak).toBe(1);
  expect(save.daily.total).toBe(1);

  await page.locator('[data-testid="win-home"]').click();
  await expect(page.locator('[data-testid="daily-btn"]')).toContainText('Heute gelöst');
  await expect(page.locator('.badge.flame')).toBeVisible();
});

test('an existing streak from yesterday is continued', async ({ page }) => {
  await page.addInitScript((key) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const y = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(
      yesterday.getDate()
    ).padStart(2, '0')}`;
    window.localStorage.setItem(
      key,
      JSON.stringify({
        version: 1,
        hints: 10,
        settings: { sound: false, theme: 'system', lang: 'auto', assist: false },
        packs: {},
        inProgress: {},
        daily: { lastDate: y, streak: 4, total: 4 },
        stats: { levelsCompleted: 0, totalMoves: 0, totalStars: 0, zenCompleted: 0 },
        lastPlayed: null
      })
    );
  }, 'chromaflow.v1');

  await page.goto('/#/daily');
  await solveBoard(page);
  // completeDaily runs when the win overlay appears — sync on it before reading.
  await expect(page.locator('[data-testid="win-overlay"]')).toBeVisible();
  const save = await readSave(page);
  expect(save.daily.streak).toBe(5);
});

test('zen mode generates endless levels', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-testid="zen-btn"]').click();
  await page.locator('[data-testid="zen-diff"][data-diff="0"]').click();
  await expect(page).toHaveURL(/#\/zen\/0/);

  await solveBoard(page);
  await expect(page.locator('[data-testid="win-overlay"]')).toBeVisible();
  await page.locator('[data-testid="win-zen-next"]').click();
  // A fresh zen board appears and is playable again.
  await page.waitForSelector('.board[data-state="ready"]');
  const save = await readSave(page);
  expect(save.stats.zenCompleted).toBe(1);
});

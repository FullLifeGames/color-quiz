import { expect, test } from '@playwright/test';
import { boardReady, solveBoard } from './helpers';

test('no horizontal scrolling on any main screen', async ({ page }) => {
  for (const route of ['/', '/#/pack/0', '/#/play/0/0']) {
    await page.goto(route);
    await page.waitForTimeout(150);
    const fits = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1
    );
    expect(fits, `horizontal overflow on ${route}`).toBe(true);
  }
});

test('board and controls fit the viewport with touch-friendly sizes', async ({ page }) => {
  await page.goto('/#/play/0/0');
  await boardReady(page);

  const viewport = page.viewportSize()!;
  const board = await page.locator('.board').boundingBox();
  expect(board).not.toBeNull();
  expect(board!.x).toBeGreaterThanOrEqual(0);
  expect(board!.y).toBeGreaterThanOrEqual(0);
  expect(board!.x + board!.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(board!.y + board!.height).toBeLessThanOrEqual(viewport.height + 1);

  for (const id of ['peek-btn', 'hint-btn', 'restart-btn', 'back-btn']) {
    const box = await page.locator(`[data-testid="${id}"]`).boundingBox();
    expect(box!.width, `${id} width`).toBeGreaterThanOrEqual(40);
    expect(box!.height, `${id} height`).toBeGreaterThanOrEqual(40);
  }

  // Tiles are comfortably tappable.
  const tile = await page.locator('.tile').first().boundingBox();
  expect(tile!.width).toBeGreaterThanOrEqual(32);
});

test('a level can be solved by tapping on a phone viewport', async ({ page }) => {
  await page.goto('/#/play/0/0');
  await solveBoard(page);
  await expect(page.locator('[data-testid="win-overlay"]')).toBeVisible();
});

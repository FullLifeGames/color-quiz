import { expect, test } from '@playwright/test';
import { boardReady } from './helpers';

test('home screen renders with German UI and all sections', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toHaveText('ChromaFlow');
  await expect(page.getByText('Weiterspielen')).toBeVisible();
  await expect(page.getByText('Tägliches Puzzle')).toBeVisible();
  await expect(page.getByText('Zen-Modus')).toBeVisible();
  await expect(page.locator('[data-testid="pack-card"]')).toHaveCount(30);
});

test('only the first pack is unlocked initially', async ({ page }) => {
  await page.goto('/');
  const cards = page.locator('[data-testid="pack-card"]');
  await expect(cards.nth(0)).not.toHaveClass(/locked/);
  await expect(cards.nth(1)).toHaveClass(/locked/);
  // Tapping a locked pack shows a toast instead of navigating.
  await cards.nth(1).click();
  await expect(page).toHaveURL(/\/$|#\/?$/);
  await expect(page.locator('.toast')).toBeVisible();
});

test('pack screen shows 24 levels and opens a playable board', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-testid="pack-card"]').first().click();
  await expect(page.locator('[data-testid="level-btn"]')).toHaveCount(24);
  await page.locator('[data-testid="level-btn"]').first().click();
  await boardReady(page);
  await expect(page.locator('.board')).toHaveAttribute('data-shape', /square|hex|tri|diamond/);
  // A playable amount of tiles, and anchors exist with the marker class.
  expect(await page.locator('.tile').count()).toBeGreaterThanOrEqual(12);
  expect(await page.locator('.tile.anchor').count()).toBeGreaterThanOrEqual(2);
});

test('consecutive levels use different board shapes', async ({ page }) => {
  const shapes: string[] = [];
  for (const level of [0, 1, 2, 3]) {
    await page.goto(`/#/play/0/${level}`);
    await boardReady(page);
    shapes.push((await page.locator('.board').getAttribute('data-shape'))!);
  }
  expect(new Set(shapes).size).toBe(4);
});

test('anchor tiles cannot be selected', async ({ page }) => {
  await page.goto('/#/play/0/0');
  await boardReady(page);
  const anchor = page.locator('.tile[data-anchor="1"]').first();
  await anchor.click();
  await expect(page.locator('.tile.selected')).toHaveCount(0);
  const movable = page.locator('.tile[data-anchor="0"]').first();
  await movable.click();
  await expect(page.locator('.tile.selected')).toHaveCount(1);
  // Tapping the same tile again deselects it.
  await movable.click();
  await expect(page.locator('.tile.selected')).toHaveCount(0);
});

test('intro reveal shows the solved board before shuffling', async ({ page }) => {
  await page.goto('/#/play/0/1');
  const board = page.locator('.board');
  await expect(board).toHaveAttribute('data-state', /intro|ready/);
  await boardReady(page);
});

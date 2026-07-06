import { expect, test } from '@playwright/test';
import { boardReady, makeSwaps, seededSave, solveBoard, SAVE_KEY } from './helpers';

test('an in-progress board survives a reload', async ({ page }) => {
  await page.goto('/#/play/0/0');
  await makeSwaps(page, 2);
  await expect(page.locator('[data-testid="moves"]')).toHaveText('2');

  const layoutBefore = await page.$$eval('.tile', (els) =>
    els.map((el) => `${(el as HTMLElement).dataset.tile}@${(el as HTMLElement).dataset.cell}`).sort()
  );

  await page.reload();
  await boardReady(page);
  await expect(page.locator('[data-testid="moves"]')).toHaveText('2');
  const layoutAfter = await page.$$eval('.tile', (els) =>
    els.map((el) => `${(el as HTMLElement).dataset.tile}@${(el as HTMLElement).dataset.cell}`).sort()
  );
  expect(layoutAfter).toEqual(layoutBefore);
});

test('completion state survives a reload', async ({ page }) => {
  await page.goto('/#/play/0/0');
  await solveBoard(page);
  await expect(page.locator('[data-testid="win-overlay"]')).toBeVisible();

  await page.goto('/#/pack/0');
  await page.reload();
  const done = page.locator('[data-testid="level-btn"][data-level="0"]');
  await expect(done).toHaveClass(/done/);
});

test('a pre-seeded save is honored (unlocking pack 2)', async ({ page }) => {
  await page.addInitScript(
    ([key, save]) => window.localStorage.setItem(key, save),
    [SAVE_KEY, seededSave(12)] as const
  );
  await page.goto('/');
  const cards = page.locator('[data-testid="pack-card"]');
  await expect(cards.nth(1)).not.toHaveClass(/locked/);
  await expect(cards.nth(2)).toHaveClass(/locked/);
  await cards.nth(1).click();
  await expect(page).toHaveURL(/#\/pack\/1/);
  await expect(page.locator('[data-testid="level-btn"]')).toHaveCount(24);
});

test('the continue button targets the first open level', async ({ page }) => {
  await page.addInitScript(
    ([key, save]) => window.localStorage.setItem(key, save),
    [SAVE_KEY, seededSave(3)] as const
  );
  await page.goto('/');
  await expect(page.locator('[data-testid="continue-btn"]')).toContainText('Level 4');
  await page.locator('[data-testid="continue-btn"]').click();
  await expect(page).toHaveURL(/#\/play\/0\/3/);
});

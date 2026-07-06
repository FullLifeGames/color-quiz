import type { Page } from '@playwright/test';

export const SAVE_KEY = 'chromaflow.v1';

/** Wait until the board accepts input. */
export async function boardReady(page: Page): Promise<void> {
  await page.waitForSelector('.board[data-state="ready"]', { timeout: 15_000 });
}

interface TileInfo {
  tile: number;
  cell: number;
  anchor: boolean;
}

async function readTiles(page: Page): Promise<TileInfo[]> {
  return page.$$eval('.tile', (els) =>
    els.map((el) => ({
      tile: Number((el as HTMLElement).dataset.tile),
      cell: Number((el as HTMLElement).dataset.cell),
      anchor: (el as HTMLElement).dataset.anchor === '1'
    }))
  );
}

/**
 * Solve the current board optimally by tapping pairs: pick a misplaced tile,
 * tap it, then tap the tile currently occupying its home cell. Every swap
 * sends at least one tile home, so this uses exactly `par` moves.
 */
export async function solveBoard(page: Page): Promise<number> {
  await boardReady(page);
  let moves = 0;
  for (let safety = 0; safety < 300; safety++) {
    const tiles = await readTiles(page);
    const wrong = tiles.find((t) => !t.anchor && t.tile !== t.cell);
    if (!wrong) break;
    const partner = tiles.find((t) => t.cell === wrong.tile)!;
    await page.locator(`.tile[data-tile="${wrong.tile}"]`).click();
    await page.locator(`.tile[data-tile="${partner.tile}"]`).click();
    moves++;
  }
  return moves;
}

/** Perform n swaps that move tiles (not necessarily towards the solution). */
export async function makeSwaps(page: Page, n: number): Promise<void> {
  await boardReady(page);
  for (let i = 0; i < n; i++) {
    const tiles = await readTiles(page);
    const movable = tiles.filter((t) => !t.anchor);
    await page.locator(`.tile[data-tile="${movable[0].tile}"]`).click();
    await page.locator(`.tile[data-tile="${movable[1].tile}"]`).click();
  }
}

export async function readSave(page: Page): Promise<any> {
  return page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) ?? 'null'), SAVE_KEY);
}

/** Pre-seed a save where the first `n` levels of pack 0 are completed. */
export function seededSave(n: number): string {
  return JSON.stringify({
    version: 1,
    hints: 10,
    settings: { sound: false, theme: 'system', lang: 'auto', assist: false },
    packs: {
      '0': Object.fromEntries(
        Array.from({ length: n }, (_, i) => [String(i), { stars: 2, bestMoves: 10 }])
      )
    },
    inProgress: {},
    daily: { lastDate: null, streak: 0, total: 0 },
    stats: { levelsCompleted: n, totalMoves: 10 * n, totalStars: 2 * n, zenCompleted: 0 },
    lastPlayed: null
  });
}

/** Live smoke against the deployed GitHub Pages site. */
import { chromium } from '@playwright/test';

const BASE = 'https://fulllifegames.github.io/color-quiz';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 412, height: 915 } });
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));

await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
console.log('title:', await page.title());
console.log('packs:', await page.locator('[data-testid="pack-card"]').count());

await page.goto(`${BASE}/#/play/0/0`);
await page.waitForSelector('.board[data-state="ready"]', { timeout: 20_000 });
console.log('board tiles:', await page.locator('.tile').count());

// One swap to confirm interactivity + LocalStorage write on the live origin.
const tiles = await page.$$eval('.tile', (els) =>
  els.map((el) => ({ tile: Number(el.dataset.tile), cell: Number(el.dataset.cell), anchor: el.dataset.anchor === '1' }))
);
const w = tiles.find((t) => !t.anchor && t.tile !== t.cell);
const p = tiles.find((t) => t.cell === w.tile);
await page.locator(`.tile[data-tile="${w.tile}"]`).click({ force: true });
await page.locator(`.tile[data-tile="${p.tile}"]`).click({ force: true });
await page.waitForTimeout(300);
console.log('moves after swap:', await page.locator('[data-testid="moves"]').textContent());
const save = await page.evaluate(() => JSON.parse(localStorage.getItem('chromaflow.v1') ?? 'null'));
console.log('save inProgress keys:', Object.keys(save?.inProgress ?? {}).join('|') || 'none');

// PWA bits reachable?
for (const asset of ['manifest.webmanifest', 'sw.js', 'icons/icon-192.png']) {
  const res = await page.request.get(`${BASE}/${asset}`);
  console.log(asset, '→', res.status());
}
await page.screenshot({ path: '.shots/live-board.png' });
await browser.close();
console.log('LIVE OK');

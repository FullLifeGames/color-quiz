/**
 * Verification drive: exercises ChromaFlow like a real user (no webdriver
 * test mode — real animations, real timings). Captures screenshots and
 * observations to .shots/verify-*.
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });
const log = (...a) => console.log('•', ...a);

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 412, height: 915 },
  locale: 'de-DE',
  hasTouch: true
});
// Hide automation so the app runs in real-user mode (full animations).
await context.addInitScript(() => {
  Object.defineProperty(navigator, 'webdriver', { get: () => false });
});
const page = await context.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
page.on('console', (m) => {
  if (m.type() === 'error') console.log('CONSOLE ERROR:', m.text());
});

const tiles = () =>
  page.$$eval('.tile', (els) =>
    els.map((el) => ({
      tile: Number(el.dataset.tile),
      cell: Number(el.dataset.cell),
      anchor: el.dataset.anchor === '1'
    }))
  );
const misplacedCount = async () => (await tiles()).filter((t) => !t.anchor && t.tile !== t.cell).length;

// 1. Home
await page.goto(BASE);
await page.waitForTimeout(400);
await page.screenshot({ path: '.shots/verify-01-home.png' });
log('home loaded, packs:', await page.locator('[data-testid="pack-card"]').count());

// 2. Open pack 1, level 1 — watch the real intro
await page.locator('[data-testid="pack-card"]').first().click();
await page.locator('[data-testid="level-btn"]').first().click();
await page.waitForTimeout(350); // mid-reveal
await page.screenshot({ path: '.shots/verify-02-intro-reveal.png' });
await page.waitForSelector('.board[data-state="ready"]', { timeout: 10_000 });
await page.screenshot({ path: '.shots/verify-03-shuffled.png' });
log('board ready; misplaced tiles:', await misplacedCount());

// 3. DRAG a misplaced tile onto its home cell (real pointer gesture)
const before = await tiles();
const wrong = before.find((t) => !t.anchor && t.tile !== t.cell);
const homeOccupant = before.find((t) => t.cell === wrong.tile);
const a = await page.locator(`.tile[data-tile="${wrong.tile}"]`).boundingBox();
const b = await page.locator(`.tile[data-tile="${homeOccupant.tile}"]`).boundingBox();
await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
await page.mouse.down();
for (let i = 1; i <= 8; i++) {
  await page.mouse.move(
    a.x + a.width / 2 + ((b.x - a.x) * i) / 8,
    a.y + a.height / 2 + ((b.y - a.y) * i) / 8
  );
  await page.waitForTimeout(30);
}
await page.screenshot({ path: '.shots/verify-04-dragging.png' });
await page.mouse.up();
await page.waitForTimeout(400);
const afterDrag = await tiles();
const dragged = afterDrag.find((t) => t.tile === wrong.tile);
log(dragged.cell === wrong.tile ? 'DRAG swap OK (tile landed home)' : `DRAG FAILED: tile at ${dragged.cell}, expected ${wrong.tile}`);
log('moves shown:', await page.locator('[data-testid="moves"]').textContent());

// 4. PROBE: drag onto an anchor cell → must spring back
const t2 = await tiles();
const wrong2 = t2.find((x) => !x.anchor && x.tile !== x.cell);
const anchor = t2.find((x) => x.anchor);
const a2 = await page.locator(`.tile[data-tile="${wrong2.tile}"]`).boundingBox();
const an = await page.locator(`.tile[data-tile="${anchor.tile}"]`).boundingBox();
await page.mouse.move(a2.x + a2.width / 2, a2.y + a2.height / 2);
await page.mouse.down();
await page.mouse.move(an.x + an.width / 2, an.y + an.height / 2, { steps: 6 });
await page.mouse.up();
await page.waitForTimeout(400);
const afterAnchorDrop = await tiles();
const stayed = afterAnchorDrop.find((x) => x.tile === wrong2.tile).cell === wrong2.cell;
log(stayed ? 'PROBE anchor-drop OK (sprang back)' : 'PROBE anchor-drop FAILED (tile moved!)');

// 5. PROBE: tap same tile twice → select then deselect
await page.locator(`.tile[data-tile="${wrong2.tile}"]`).tap({ force: true });
const selCount1 = await page.locator('.tile.selected').count();
await page.locator(`.tile[data-tile="${wrong2.tile}"]`).tap({ force: true });
const selCount2 = await page.locator('.tile.selected').count();
log(`PROBE tap-tap-same: selected ${selCount1} → ${selCount2} (expect 1 → 0)`);

// 6. Peek (hold)
const peekBtn = await page.locator('[data-testid="peek-btn"]').boundingBox();
await page.mouse.move(peekBtn.x + 20, peekBtn.y + 20);
await page.mouse.down();
await page.waitForTimeout(250);
await page.screenshot({ path: '.shots/verify-05-peek.png' });
const peekOn = await page.locator('.peek').getAttribute('data-peek');
await page.mouse.up();
await page.waitForTimeout(200);
const peekOff = await page.locator('.peek').getAttribute('data-peek');
log(`peek hold: ${peekOn} → release: ${peekOff} (expect 1 → 0)`);

// 7. Hint
await page.locator('[data-testid="hint-btn"]').tap({ force: true });
await page.waitForTimeout(300);
await page.screenshot({ path: '.shots/verify-06-hint.png' });
log('hint highlights:', await page.locator('.tile.hint-from').count(), '+', await page.locator('.tile.hint-to').count());
log('hint tokens now:', await page.locator('[data-testid="hint-count"]').textContent());

// 8. Solve the rest by tapping pairs (real user flow)
for (let safety = 0; safety < 60; safety++) {
  const ts = await tiles();
  const w = ts.find((t) => !t.anchor && t.tile !== t.cell);
  if (!w) break;
  const p = ts.find((t) => t.cell === w.tile);
  await page.locator(`.tile[data-tile="${w.tile}"]`).tap({ force: true });
  await page.locator(`.tile[data-tile="${p.tile}"]`).tap({ force: true });
  await page.waitForTimeout(320);
}
log('misplaced after solving:', await misplacedCount());
await page.waitForSelector('[data-testid="win-overlay"]', { timeout: 10_000 });
await page.waitForTimeout(900); // stars + confetti
await page.screenshot({ path: '.shots/verify-07-win.png' });
log('win overlay stars:', await page.locator('[data-testid="win-stars"]').getAttribute('data-stars'));
log('hint tokens after win:', await page.locator('[data-testid="hint-count"]').textContent());

// 9. Weiter → level 2, two swaps, reload → persisted?
await page.locator('[data-testid="win-next"]').click();
await page.waitForSelector('.board[data-state="ready"]', { timeout: 10_000 });
for (let i = 0; i < 2; i++) {
  const ts = await tiles();
  const m = ts.filter((t) => !t.anchor);
  await page.locator(`.tile[data-tile="${m[0].tile}"]`).tap({ force: true });
  await page.locator(`.tile[data-tile="${m[1].tile}"]`).tap({ force: true });
  await page.waitForTimeout(350);
}
const movesBefore = await page.locator('[data-testid="moves"]').textContent();
const layoutBefore = (await tiles()).map((t) => `${t.tile}@${t.cell}`).sort().join(',');
await page.reload();
await page.waitForSelector('.board[data-state="ready"]', { timeout: 10_000 });
const movesAfter = await page.locator('[data-testid="moves"]').textContent();
const layoutAfter = (await tiles()).map((t) => `${t.tile}@${t.cell}`).sort().join(',');
log(`reload persistence: moves ${movesBefore} → ${movesAfter}, layout ${layoutBefore === layoutAfter ? 'identical' : 'DIFFERENT!'}`);

// 10. PROBE: resize during the intro shuffle (the fixed race)
await page.goto(`${BASE}/#/play/0/2`);
await page.waitForTimeout(1100); // mid-shuffle (reveal 900ms + shuffle 700ms)
await page.setViewportSize({ width: 800, height: 600 });
await page.waitForSelector('.board[data-state="ready"]', { timeout: 10_000 });
await page.waitForTimeout(300);
const misAfterResize = await misplacedCount();
log(`PROBE resize-during-intro: misplaced=${misAfterResize} (0 would mean the old race snapped tiles solved)`);
await page.setViewportSize({ width: 412, height: 915 });

// 11. Settings: dark theme
await page.goto(`${BASE}/#/`);
await page.locator('[data-testid="settings-btn"]').click();
await page.locator('.segment[data-setting="theme"] .seg-btn[data-value="dark"]').click();
await page.locator('[data-testid="close-settings"]').click();
await page.waitForTimeout(300);
await page.screenshot({ path: '.shots/verify-08-dark-home.png' });
log('theme attr:', await page.locator('html').getAttribute('data-theme'));

// 12. Daily board opens
await page.locator('[data-testid="daily-btn"]').click();
await page.waitForSelector('.board[data-state="ready"]', { timeout: 10_000 });
await page.screenshot({ path: '.shots/verify-09-daily.png' });
log('daily board tiles:', (await tiles()).length);

// 13. Save shape
const save = await page.evaluate(() => JSON.parse(localStorage.getItem('chromaflow.v1')));
log('save: completed=', save.stats.levelsCompleted, 'hints=', save.hints, 'inProgress keys=', Object.keys(save.inProgress).join('|'));

await browser.close();
console.log('DONE');

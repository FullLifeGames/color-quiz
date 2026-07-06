/**
 * Design review helper: captures screenshots of the main screens
 * (desktop + mobile, light + dark) from a running preview server.
 * Usage: npm run build && npm run preview  (in another terminal), then
 *        node scripts/shots.mjs [outDir]
 */
import { chromium, devices } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.SHOTS_BASE ?? 'http://localhost:4173';
const OUT = process.argv[2] ?? '.shots';
mkdirSync(OUT, { recursive: true });

const targets = [
  { name: 'desktop', options: { viewport: { width: 1280, height: 800 } } },
  { name: 'mobile', options: { ...devices['Pixel 7'] } }
];

const browser = await chromium.launch();
for (const scheme of ['light', 'dark']) {
  for (const target of targets) {
    const context = await browser.newContext({ ...target.options, colorScheme: scheme, locale: 'de-DE' });
    const page = await context.newPage();
    const shot = async (route, name, prep) => {
      await page.goto(`${BASE}/#/${route}`);
      await page.waitForTimeout(300);
      if (prep) await prep();
      await page.screenshot({ path: join(OUT, `${target.name}-${scheme}-${name}.png`), fullPage: false });
    };
    await shot('', 'home');
    await shot('pack/0', 'pack');
    await shot('play/0/0', 'game-easy', () => page.waitForTimeout(500));
    await shot('play/0/23', 'game-hard', () => page.waitForTimeout(500));
    await context.close();
  }
}
await browser.close();
console.log(`screenshots written to ${OUT}/`);

/**
 * Generates the PWA icons programmatically (pngjs): a four-corner color
 * gradient with rounded corners and a white "anchor dot" motif.
 * Run once via `npm run icons`; outputs are committed.
 */
import { PNG } from 'pngjs';
import { mkdirSync, writeFileSync } from 'node:fs';

const CORNERS = [
  [233, 106, 141], // pink
  [238, 154, 77], // orange
  [74, 144, 217], // blue
  [88, 179, 104] // green
];

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function pixel(x, y, size) {
  const tx = x / (size - 1);
  const ty = y / (size - 1);
  const c = [];
  for (let i = 0; i < 3; i++) {
    const top = lerp(CORNERS[0][i], CORNERS[1][i], tx);
    const bottom = lerp(CORNERS[2][i], CORNERS[3][i], tx);
    c.push(Math.round(lerp(top, bottom, ty)));
  }
  return c;
}

/** Alpha for rounded-rect mask (with 1px anti-alias edge). */
function roundedAlpha(x, y, size, radius) {
  const r = radius;
  const cx = Math.max(r, Math.min(size - r, x + 0.5));
  const cy = Math.max(r, Math.min(size - r, y + 0.5));
  const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
  if (d <= r - 1) return 255;
  if (d >= r + 1) return 0;
  return Math.round(255 * (1 - (d - (r - 1)) / 2));
}

function makeIcon(size, { rounded = true, dot = true } = {}) {
  const png = new PNG({ width: size, height: size });
  const radius = rounded ? size * 0.22 : 0;
  const dotR = size * 0.1;
  const center = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2;
      let [r, g, b] = pixel(x, y, size);
      if (dot) {
        const d = Math.hypot(x + 0.5 - center, y + 0.5 - center);
        if (d < dotR) {
          const mix = Math.min(1, Math.max(0, dotR - d));
          r = Math.round(lerp(r, 255, 0.92 * mix));
          g = Math.round(lerp(g, 255, 0.92 * mix));
          b = Math.round(lerp(b, 255, 0.92 * mix));
        }
      }
      png.data[idx] = r;
      png.data[idx + 1] = g;
      png.data[idx + 2] = b;
      png.data[idx + 3] = rounded ? roundedAlpha(x, y, size, radius) : 255;
    }
  }
  return PNG.sync.write(png);
}

mkdirSync('public/icons', { recursive: true });
writeFileSync('public/icons/icon-192.png', makeIcon(192));
writeFileSync('public/icons/icon-512.png', makeIcon(512));
writeFileSync('public/icons/apple-touch-icon.png', makeIcon(180, { rounded: false }));
writeFileSync('public/icons/maskable-512.png', makeIcon(512, { rounded: false }));
console.log('icons written to public/icons/');

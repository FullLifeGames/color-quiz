/**
 * Color generation: 4 validated corner colors from a pack palette, bilinear
 * interpolation across the grid, and perceptual distance checks in Oklab.
 */
import chroma from 'chroma-js';
import { rngRange, rngShuffle, type Rng } from './rng';

export interface Palette {
  /** Base hue in degrees (Oklch). */
  hueBase: number;
  /** Total hue span across the board in degrees. */
  hueSpan: number;
  /** Oklch chroma range [min, max] (≈ 0.03 muted … 0.22 vivid). */
  chromaRange: [number, number];
  /** Oklch lightness range [min, max] in [0, 1]. */
  lightRange: [number, number];
  /** Interpolation mode; 'oklch' keeps saturation on wide hue spans (rainbow packs). */
  mode?: 'oklab' | 'oklch';
}

export type OKLab = readonly [number, number, number];

export function toOklab(hex: string): OKLab {
  return chroma(hex).oklab() as unknown as OKLab;
}

/** Euclidean distance in Oklab. ~0.01 is a just-noticeable difference. */
export function okDist(a: OKLab, b: OKLab): number {
  const dl = a[0] - b[0];
  const da = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt(dl * dl + da * da + db * db);
}

/** Smallest pairwise Oklab distance across all colors. */
export function minPairDist(labs: readonly OKLab[]): number {
  let min = Infinity;
  for (let i = 0; i < labs.length; i++) {
    for (let j = i + 1; j < labs.length; j++) {
      const d = okDist(labs[i], labs[j]);
      if (d < min) min = d;
    }
  }
  return min;
}

/**
 * Pick 4 corner colors (TL, TR, BL, BR) from the palette. Hues are spread over
 * the (difficulty-narrowed) span, lightness values are spread over the range and
 * shuffled so the gradient direction varies per level.
 */
export function makeCorners(rng: Rng, palette: Palette, difficulty: number): string[] {
  // Mild narrowing only: difficulty already scales via tile count, and hard
  // levels on big boards need MORE color volume, not less.
  const span = palette.hueSpan * (1 - 0.2 * difficulty);
  const minCornerDist = 0.16 - 0.06 * difficulty;

  for (let attempt = 0; attempt < 48; attempt++) {
    const h0 = palette.hueBase + rngRange(rng, -14, 14) - span / 2;
    const hueFracs = rngShuffle(rng, [0, 0.34, 0.66, 1]);
    const [lMin, lMax] = palette.lightRange;
    const lStep = (lMax - lMin) / 3;
    const lights = rngShuffle(
      rng,
      [0, 1, 2, 3].map((i) => lMin + i * lStep + rngRange(rng, -0.35, 0.35) * lStep)
    );
    const corners = hueFracs.map((f, i) => {
      const h = (h0 + f * span + rngRange(rng, -6, 6) + 360) % 360;
      const c = rngRange(rng, palette.chromaRange[0], palette.chromaRange[1]);
      return chroma.oklch(clamp01(lights[i]), c, h).hex();
    });
    if (minPairDist(corners.map(toOklab)) >= minCornerDist * (1 - attempt / 64)) {
      return corners;
    }
  }
  /* istanbul ignore next -- loop above always returns in practice */
  throw new Error('makeCorners: could not find distinct corners');
}

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

/**
 * Bilinear interpolation between corners [TL, TR, BL, BR] over a cols×rows grid.
 * Returns hex colors in row-major cell order.
 */
export function gridColors(
  corners: readonly string[],
  cols: number,
  rows: number,
  mode: 'oklab' | 'oklch' = 'oklab'
): string[] {
  const [tl, tr, bl, br] = corners;
  const out: string[] = [];
  for (let r = 0; r < rows; r++) {
    const ty = rows === 1 ? 0 : r / (rows - 1);
    const left = chroma.mix(tl, bl, ty, mode);
    const right = chroma.mix(tr, br, ty, mode);
    for (let c = 0; c < cols; c++) {
      const tx = cols === 1 ? 0 : c / (cols - 1);
      out.push(chroma.mix(left, right, tx, mode).hex());
    }
  }
  return out;
}

/** Whether a dark marker (anchor dot) is readable on this tile color. */
export function prefersDarkMarker(hex: string): boolean {
  return chroma(hex).luminance() > 0.35;
}

/** Representative palette color at a fraction of the hue span (UI swatches). */
export function paletteSwatch(palette: Palette, frac: number): string {
  const [lMin, lMax] = palette.lightRange;
  const [cMin, cMax] = palette.chromaRange;
  const h = (palette.hueBase + (frac - 0.5) * Math.min(palette.hueSpan, 180) + 360) % 360;
  return chroma.oklch(lMin + (lMax - lMin) * 0.62, (cMin + cMax) / 2, h).hex();
}

/** Evenly spaced palette colors for CSS gradients on pack cards. */
export function paletteStops(palette: Palette, n = 5): string[] {
  const [lMin, lMax] = palette.lightRange;
  const [cMin, cMax] = palette.chromaRange;
  const span = Math.min(palette.hueSpan, 200);
  return Array.from({ length: n }, (_, i) => {
    const f = n === 1 ? 0.5 : i / (n - 1);
    const h = (palette.hueBase + (f - 0.5) * span + 360) % 360;
    const l = lMin + (lMax - lMin) * (0.75 - 0.35 * f);
    return chroma.oklch(l, (cMin + cMax) / 2, h).hex();
  });
}

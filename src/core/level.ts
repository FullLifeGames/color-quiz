/** Deterministic level generation with perceptual-distance validation. */
import { gridColors, makeCorners, minPairDist, toOklab, type Palette } from './color';
import { rngFromKey, rngInt, rngPick, type Rng } from './rng';
import { makeShuffle, minSwaps } from './permutation';
import { difficulty as packDifficulty, levelPalette } from './packs';

export interface Level {
  key: string;
  cols: number;
  rows: number;
  /** Solved colors, row-major; colors[tileId] is the tile's own color. */
  colors: string[];
  anchors: boolean[];
  /** Initial shuffle: initialPerm[cell] = tileId. */
  initialPerm: number[];
  /** Minimum number of swaps to solve from the initial shuffle. */
  par: number;
  /** Estimated moves an average player needs (par plus difficulty-scaled slack). */
  goal: number;
}

const GRID_SIZES: Array<[maxD: number, cols: number, rows: number]> = [
  [0.08, 4, 5],
  [0.18, 5, 6],
  [0.3, 5, 7],
  [0.42, 6, 8],
  [0.55, 6, 9],
  [0.68, 7, 10],
  [0.8, 8, 11],
  [0.9, 8, 12],
  [1.01, 9, 13]
];

function pickGrid(d: number): { cols: number; rows: number } {
  for (const [maxD, cols, rows] of GRID_SIZES) {
    if (d < maxD) return { cols, rows };
  }
  return { cols: 9, rows: 13 };
}

type AnchorPattern = (cols: number, rows: number, rng: Rng) => boolean[];

const edge = (cols: number, rows: number, test: (c: number, r: number) => boolean): boolean[] => {
  const out = new Array(cols * rows).fill(false);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) out[r * cols + c] = test(c, r);
  }
  return out;
};

const isBorder = (c: number, r: number, cols: number, rows: number) =>
  c === 0 || r === 0 || c === cols - 1 || r === rows - 1;
const isCorner = (c: number, r: number, cols: number, rows: number) =>
  (c === 0 || c === cols - 1) && (r === 0 || r === rows - 1);

/** Patterns from generous (easy) to sparse (hard). */
const PATTERNS: Record<string, AnchorPattern> = {
  fullBorder: (cols, rows) => edge(cols, rows, (c, r) => isBorder(c, r, cols, rows)),
  altBorder: (cols, rows) =>
    edge(cols, rows, (c, r) => isCorner(c, r, cols, rows) || (isBorder(c, r, cols, rows) && (c + r) % 2 === 0)),
  sideColumns: (cols, rows) => edge(cols, rows, (c) => c === 0 || c === cols - 1),
  topBottom: (cols, rows) => edge(cols, rows, (c, r) => r === 0 || r === rows - 1),
  cornersPlus: (cols, rows) =>
    edge(
      cols,
      rows,
      (c, r) =>
        isCorner(c, r, cols, rows) ||
        (isBorder(c, r, cols, rows) && ((r === 0 || r === rows - 1) ? c === Math.floor(cols / 2) : r === Math.floor(rows / 2)))
    ),
  scatter: (cols, rows, rng) => {
    const out = edge(cols, rows, (c, r) => isCorner(c, r, cols, rows));
    const extra = rngInt(rng, 3, 5);
    for (let k = 0; k < extra; k++) {
      out[rngInt(rng, 0, cols * rows - 1)] = true;
    }
    return out;
  },
  cornersOnly: (cols, rows) => edge(cols, rows, (c, r) => isCorner(c, r, cols, rows))
};

function patternsFor(d: number): AnchorPattern[] {
  if (d < 0.18) return [PATTERNS.fullBorder];
  if (d < 0.35) return [PATTERNS.fullBorder, PATTERNS.altBorder, PATTERNS.topBottom];
  if (d < 0.55) return [PATTERNS.altBorder, PATTERNS.sideColumns, PATTERNS.topBottom, PATTERNS.cornersPlus];
  if (d < 0.78) return [PATTERNS.cornersPlus, PATTERNS.scatter, PATTERNS.sideColumns];
  return [PATTERNS.scatter, PATTERNS.cornersOnly];
}

/** Required minimum pairwise Oklab distance between any two tiles. */
export function minTileDist(d: number): number {
  return 0.052 - 0.03 * d;
}

const cache = new Map<string, Level>();

/**
 * Generate a level from a seed key. Pure and memoized: the same key always
 * yields the same level. Regenerates deterministically until all tile colors
 * are distinguishable (relaxing the threshold slightly if necessary).
 */
export function generateLevel(key: string, d: number, palette: Palette): Level {
  const cached = cache.get(key);
  if (cached) return cached;

  const rng = rngFromKey(key);
  const { cols, rows } = pickGrid(d);
  const size = cols * rows;

  let anchors = PATTERNS.fullBorder(cols, rows, rng);
  const candidates = patternsFor(d);
  for (let attempt = 0; attempt < 12; attempt++) {
    anchors = rngPick(rng, candidates)(cols, rows, rng);
    const movable = anchors.filter((a) => !a).length;
    if (movable >= 6 && anchors.filter(Boolean).length >= 2) break;
  }

  // Best-of-N corner search: accept the first candidate that meets the
  // difficulty target, otherwise keep the most distinguishable one found.
  const threshold = minTileDist(d);
  let colors: string[] = [];
  let bestDist = -1;
  for (let attempt = 0; attempt < 40; attempt++) {
    const corners = makeCorners(rng, palette, d);
    const candidate = gridColors(corners, cols, rows, palette.mode ?? 'oklab');
    const dist = minPairDist(candidate.map(toOklab));
    if (dist > bestDist) {
      bestDist = dist;
      colors = candidate;
    }
    if (dist >= threshold) break;
  }

  const initialPerm = makeShuffle(size, anchors, rng);
  const par = Math.max(1, minSwaps(initialPerm));
  const level: Level = {
    key,
    cols,
    rows,
    colors,
    anchors,
    initialPerm,
    par,
    // Optimal play places one tile home per swap; real players lose extra
    // moves to look-alike tiles, and more so the subtler the board gets.
    goal: Math.ceil(par * (1.35 + 0.5 * d))
  };
  cache.set(key, level);
  return level;
}

export function packLevel(packIdx: number, levelIdx: number): Level {
  return generateLevel(`p${packIdx}-l${levelIdx}`, packDifficulty(packIdx, levelIdx), levelPalette(packIdx, levelIdx));
}

/** Star rating: 3 near par, 2 within roughly double, 1 for finishing. */
export function starsFor(moves: number, par: number): 1 | 2 | 3 {
  if (moves <= Math.ceil(par * 1.25)) return 3;
  if (moves <= Math.ceil(par * 2.2)) return 2;
  return 1;
}

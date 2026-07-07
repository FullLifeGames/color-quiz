/** Deterministic level generation with perceptual-distance validation. */
import { cellColors, makeCorners, minPairDist, toOklab, type Palette } from './color';
import { hashString, rngFromKey, rngInt, rngPick, type Rng } from './rng';
import { makeShuffle, minSwaps } from './permutation';
import { difficulty as packDifficulty, levelPalette } from './packs';
import { makeGeometry, SHAPES, type BoardGeom, type ShapeId } from './geometry';

export interface Level {
  key: string;
  shape: ShapeId;
  /** Cell layout; the number of cells is `geom.cells.length`. */
  geom: BoardGeom;
  /** Solved colors; colors[tileId] is the tile's own color. */
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

type AnchorPattern = (g: BoardGeom, rng: Rng) => boolean[];

/** Patterns from generous (easy) to sparse (hard), on any geometry. */
const PATTERNS: Record<string, AnchorPattern> = {
  fullBorder: (g) => g.cells.map((c) => c.border),
  altBorder: (g) => g.cells.map((c, i) => c.corner || (c.border && i % 2 === 0)),
  sideColumns: (g) => axisBorder(g, 'cx'),
  topBottom: (g) => axisBorder(g, 'cy'),
  cornersPlus: (g) => {
    const out = g.cells.map((c) => c.corner);
    const mids: Array<[number, number]> = [
      [g.width / 2, 0],
      [g.width / 2, g.height],
      [0, g.height / 2],
      [g.width, g.height / 2]
    ];
    for (const [mx, my] of mids) {
      let best = -1;
      let bestD = Infinity;
      g.cells.forEach((c, i) => {
        if (!c.border) return;
        const d = (c.cx - mx) ** 2 + (c.cy - my) ** 2;
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });
      if (best >= 0) out[best] = true;
    }
    return out;
  },
  scatter: (g, rng) => {
    const out = g.cells.map((c) => c.corner);
    const extra = rngInt(rng, 3, 5);
    for (let k = 0; k < extra; k++) {
      out[rngInt(rng, 0, g.cells.length - 1)] = true;
    }
    return out;
  },
  cornersOnly: (g) => g.cells.map((c) => c.corner)
};

/** Border cells at the extreme ends of one axis (generalized side columns / top+bottom rows). */
function axisBorder(g: BoardGeom, axis: 'cx' | 'cy'): boolean[] {
  let min = Infinity;
  let max = -Infinity;
  for (const c of g.cells) {
    min = Math.min(min, c[axis]);
    max = Math.max(max, c[axis]);
  }
  const span = max - min || 1;
  return g.cells.map((c) => {
    const f = (c[axis] - min) / span;
    return c.border && (f < 0.12 || f > 0.88);
  });
}

function patternsFor(d: number): AnchorPattern[] {
  if (d < 0.18) return [PATTERNS.fullBorder];
  if (d < 0.35) return [PATTERNS.fullBorder, PATTERNS.altBorder, PATTERNS.topBottom];
  if (d < 0.55) return [PATTERNS.altBorder, PATTERNS.sideColumns, PATTERNS.topBottom, PATTERNS.cornersPlus];
  if (d < 0.78) return [PATTERNS.cornersPlus, PATTERNS.scatter, PATTERNS.sideColumns];
  return [PATTERNS.scatter, PATTERNS.cornersOnly];
}

/**
 * Enforce the board invariants on any pattern/geometry combination:
 * at least 6 movable tiles (freeing non-corner border anchors alternately,
 * so thinned borders still read as a pattern) and at least 2 anchors.
 */
function balanceAnchors(anchors: boolean[], geom: BoardGeom): void {
  let movable = anchors.filter((a) => !a).length;
  if (movable < 6) {
    const freeable = anchors
      .map((a, i) => (a && !geom.cells[i].corner ? i : -1))
      .filter((i) => i >= 0);
    for (const start of [0, 1]) {
      for (let k = start; k < freeable.length && movable < 6; k += 2) {
        anchors[freeable[k]] = false;
        movable++;
      }
    }
  }
  let count = anchors.length - movable;
  for (let i = 0; i < anchors.length && count < 2; i++) {
    if (!anchors[i] && geom.cells[i].corner) {
      anchors[i] = true;
      count++;
    }
  }
  for (let i = 0; i < anchors.length && count < 2; i++) {
    if (!anchors[i]) {
      anchors[i] = true;
      count++;
    }
  }
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
 * The board shape defaults to a hash of the key (daily/zen variety); pack
 * levels pass an explicit rotation instead.
 */
export function generateLevel(key: string, d: number, palette: Palette, shapeOverride?: ShapeId): Level {
  const shape = shapeOverride ?? SHAPES[hashString(`shape-${key}`) % SHAPES.length];
  const cacheKey = `${key}|${shape}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const rng = rngFromKey(key);
  const { cols, rows } = pickGrid(d);
  const geom = makeGeometry(shape, cols, rows);
  const size = geom.cells.length;

  let anchors = PATTERNS.fullBorder(geom, rng);
  const candidates = patternsFor(d);
  for (let attempt = 0; attempt < 12; attempt++) {
    anchors = rngPick(rng, candidates)(geom, rng);
    const movable = anchors.filter((a) => !a).length;
    if (movable >= 6 && anchors.filter(Boolean).length >= 2) break;
  }
  balanceAnchors(anchors, geom);

  // Best-of-N corner search: accept the first candidate that meets the
  // difficulty target, otherwise keep the most distinguishable one found.
  const threshold = minTileDist(d);
  let colors: string[] = [];
  let bestDist = -1;
  const search = (pal: Palette, attempts: number): void => {
    for (let attempt = 0; attempt < attempts; attempt++) {
      const corners = makeCorners(rng, pal, d);
      const candidate = cellColors(corners, geom.cells, pal.mode ?? 'oklab');
      const dist = minPairDist(candidate.map(toOklab));
      if (dist > bestDist) {
        bestDist = dist;
        colors = candidate;
      }
      if (bestDist >= threshold) return;
    }
  };
  search(palette, 60);
  // Deterministic rescue: when the palette variant physically can't reach the
  // distinguishability floor on this board, widen it (more lightness spread,
  // more chroma) and search again.
  if (bestDist < 0.013) {
    const [lMin, lMax] = palette.lightRange;
    search(
      {
        ...palette,
        lightRange: [Math.max(0.2, lMin - 0.08), Math.min(0.98, lMax + 0.08)],
        chromaRange: [palette.chromaRange[0], Math.min(0.23, palette.chromaRange[1] * 1.15)]
      },
      40
    );
  }

  const initialPerm = makeShuffle(size, anchors, rng);
  const par = Math.max(1, minSwaps(initialPerm));
  const level: Level = {
    key,
    shape,
    geom,
    colors,
    anchors,
    initialPerm,
    par,
    // Optimal play places one tile home per swap; real players lose extra
    // moves to look-alike tiles, and more so the subtler the board gets.
    goal: Math.ceil(par * (1.35 + 0.5 * d))
  };
  cache.set(cacheKey, level);
  return level;
}

export function packLevel(packIdx: number, levelIdx: number): Level {
  // Shapes rotate per level so consecutive levels always change board type.
  const shape = SHAPES[(packIdx + levelIdx) % SHAPES.length];
  return generateLevel(`p${packIdx}-l${levelIdx}`, packDifficulty(packIdx, levelIdx), levelPalette(packIdx, levelIdx), shape);
}

/** Star rating: 3 near par, 2 within roughly double, 1 for finishing. */
export function starsFor(moves: number, par: number): 1 | 2 | 3 {
  if (moves <= Math.ceil(par * 1.25)) return 3;
  if (moves <= Math.ceil(par * 2.2)) return 2;
  return 1;
}

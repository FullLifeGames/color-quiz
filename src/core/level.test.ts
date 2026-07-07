import { describe, expect, it } from 'vitest';
import { generateLevel, minTileDist, packLevel, starsFor } from './level';
import { minPairDist, toOklab } from './color';
import { difficulty, LEVELS_PER_PACK, levelPalette, PACKS } from './packs';
import { SHAPES } from './geometry';
import { isSolved, minSwaps } from './permutation';

describe('generateLevel', () => {
  it('is deterministic (same key ⇒ identical level)', () => {
    const a = generateLevel('det-test', 0.5, PACKS[0].palette);
    const b = generateLevel('det-test', 0.5, PACKS[0].palette);
    expect(a).toBe(b); // memoized
    expect(a.colors).toEqual(b.colors);
    expect(a.initialPerm).toEqual(b.initialPerm);
  });

  it('level 1 of pack 1 is small, square and generous with anchors', () => {
    const level = packLevel(0, 0);
    expect(level.shape).toBe('square');
    expect(level.geom.cells.length).toBeLessThanOrEqual(30);
    const movable = level.anchors.filter((a) => !a).length;
    expect(movable).toBeGreaterThanOrEqual(6);
    expect(movable).toBeLessThanOrEqual(12);
  });

  it('difficulty rises across packs and levels', () => {
    expect(difficulty(0, 0)).toBeLessThan(difficulty(0, LEVELS_PER_PACK - 1));
    expect(difficulty(0, 0)).toBeLessThan(difficulty(10, 0));
    expect(difficulty(PACKS.length - 1, LEVELS_PER_PACK - 1)).toBeLessThanOrEqual(1);
  });

  it('full sweep: all 720 pack levels satisfy the guarantees', () => {
    for (let p = 0; p < PACKS.length; p++) {
      for (let l = 0; l < LEVELS_PER_PACK; l++) {
        const level = packLevel(p, l);
        const size = level.geom.cells.length;
        expect(level.shape).toBe(SHAPES[(p + l) % SHAPES.length]);
        expect(level.colors).toHaveLength(size);
        expect(level.anchors).toHaveLength(size);
        expect(level.initialPerm).toHaveLength(size);

        // Valid permutation with anchors fixed and no movable tile at home.
        expect([...level.initialPerm].sort((a, b) => a - b)).toEqual(Array.from({ length: size }, (_, i) => i));
        let movable = 0;
        level.initialPerm.forEach((tile, cell) => {
          if (level.anchors[cell]) expect(tile).toBe(cell);
          else {
            movable++;
            expect(tile).not.toBe(cell);
          }
        });
        expect(movable).toBeGreaterThanOrEqual(6);
        expect(level.anchors.filter(Boolean).length).toBeGreaterThanOrEqual(2);
        expect(isSolved(level.initialPerm)).toBe(false);
        expect(level.par).toBe(minSwaps(level.initialPerm));
        expect(level.par).toBeGreaterThanOrEqual(Math.ceil(movable / 2));
        expect(level.goal).toBeGreaterThan(level.par);
        expect(level.goal).toBeLessThanOrEqual(Math.ceil(level.par * 1.85));

        // All tiles perceptually distinguishable: hard playability floor
        // everywhere (≈ just-noticeable difference), comfortable margin on
        // beginner levels. Near-identical pairs on hard boards are part of
        // the challenge (peek + hints exist for them).
        const dist = minPairDist(level.colors.map(toOklab));
        expect(dist).toBeGreaterThan(0.012);
        if (difficulty(p, l) < 0.3) expect(dist).toBeGreaterThan(0.018);
      }
    }
  }, 120_000);

  it('varies palettes within a pack (consecutive levels shift hue noticeably)', () => {
    for (let p = 0; p < PACKS.length; p++) {
      if (PACKS[p].palette.hueSpan >= 300) continue; // rainbow packs cover the wheel anyway
      for (let l = 0; l < LEVELS_PER_PACK - 1; l++) {
        const a = levelPalette(p, l);
        const b = levelPalette(p, l + 1);
        const dh = Math.abs(((a.hueBase - b.hueBase + 540) % 360) - 180);
        expect(dh).toBeGreaterThan(15);
      }
    }
  });

  it('boards stay phone-friendly (tiles ≥ 24 px in a 380×640 board area)', () => {
    for (let p = 0; p < PACKS.length; p += 5) {
      for (let l = 0; l < LEVELS_PER_PACK; l += 3) {
        const { geom } = packLevel(p, l);
        const unit = Math.floor(Math.min(380 / geom.width, 640 / geom.height));
        expect(unit, `${geom.shape} ${geom.width}×${geom.height}`).toBeGreaterThanOrEqual(24);
      }
    }
  });
});

describe('starsFor', () => {
  it('rates near-par as 3 stars, sloppy as 1', () => {
    expect(starsFor(10, 10)).toBe(3);
    expect(starsFor(12, 10)).toBe(3); // ceil(10 * 1.25) = 13
    expect(starsFor(14, 10)).toBe(2);
    expect(starsFor(22, 10)).toBe(2);
    expect(starsFor(23, 10)).toBe(1);
    expect(starsFor(999, 10)).toBe(1);
  });
});

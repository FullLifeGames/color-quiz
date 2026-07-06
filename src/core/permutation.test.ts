import { describe, expect, it } from 'vitest';
import { applySwap, cycles, isSolved, makeShuffle, minSwaps, misplacedCells } from './permutation';
import { rngFromKey } from './rng';

function bruteForceMinSwaps(perm: number[]): number {
  // BFS over permutation states (only for tiny perms).
  const target = perm.map((_, i) => i).join(',');
  const start = perm.join(',');
  if (start === target) return 0;
  const seen = new Set([start]);
  let frontier = [perm];
  for (let depth = 1; depth < 10; depth++) {
    const next: number[][] = [];
    for (const p of frontier) {
      for (let i = 0; i < p.length; i++) {
        for (let j = i + 1; j < p.length; j++) {
          const q = p.slice();
          applySwap(q, i, j);
          const key = q.join(',');
          if (key === target) return depth;
          if (!seen.has(key)) {
            seen.add(key);
            next.push(q);
          }
        }
      }
    }
    frontier = next;
  }
  throw new Error('unreachable');
}

describe('makeShuffle', () => {
  it('keeps anchors fixed and never places a movable tile on its home cell', () => {
    for (const key of ['a', 'b', 'c', 'd', 'e']) {
      const anchors = [true, false, false, false, true, false, false, false, true, false, false, false];
      const perm = makeShuffle(12, anchors, rngFromKey(key));
      expect([...perm].sort((x, y) => x - y)).toEqual(Array.from({ length: 12 }, (_, i) => i));
      perm.forEach((tile, cell) => {
        if (anchors[cell]) expect(tile).toBe(cell);
        else expect(tile).not.toBe(cell);
      });
    }
  });

  it('is deterministic per seed', () => {
    const anchors = new Array(20).fill(false);
    expect(makeShuffle(20, anchors, rngFromKey('x'))).toEqual(makeShuffle(20, anchors, rngFromKey('x')));
  });

  it('handles fewer than 2 movable cells gracefully', () => {
    const perm = makeShuffle(4, [true, true, true, false], rngFromKey('x'));
    expect(perm).toEqual([0, 1, 2, 3]);
  });
});

describe('minSwaps / cycles / isSolved', () => {
  it('matches brute force on small permutations', () => {
    for (const key of ['p1', 'p2', 'p3', 'p4', 'p5', 'p6']) {
      const perm = makeShuffle(6, new Array(6).fill(false), rngFromKey(key));
      expect(minSwaps(perm)).toBe(bruteForceMinSwaps(perm));
    }
  });

  it('solving by minSwaps swaps reaches the identity', () => {
    const perm = makeShuffle(15, new Array(15).fill(false), rngFromKey('solve'));
    let swaps = 0;
    while (!isSolved(perm)) {
      const cell = misplacedCells(perm)[0];
      const tile = perm[cell];
      // Put the tile home: swap current cell with the tile's home cell.
      applySwap(perm, cell, tile);
      swaps++;
      expect(swaps).toBeLessThan(100);
    }
    expect(isSolved(perm)).toBe(true);
  });

  it('cycle decomposition covers all misplaced cells exactly once', () => {
    const perm = makeShuffle(12, new Array(12).fill(false), rngFromKey('cyc'));
    const all = cycles(perm).flat().sort((a, b) => a - b);
    expect(all).toEqual(misplacedCells(perm));
  });
});

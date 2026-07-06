import { describe, expect, it } from 'vitest';
import { pickHint } from './hints';
import { applySwap, isSolved } from './permutation';
import { packLevel } from './level';

describe('pickHint', () => {
  const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];

  it('returns null on a solved board', () => {
    expect(pickHint([0, 1, 2, 3, 4, 5], colors)).toBeNull();
  });

  it('prefers a 2-cycle so one swap fixes two tiles', () => {
    // 0↔1 is a 2-cycle; 2→3→4→2 is a 3-cycle.
    const perm = [1, 0, 4, 2, 3, 5];
    const hint = pickHint(perm, colors);
    expect(hint).not.toBeNull();
    const { fromCell, toCell } = hint!;
    expect([fromCell, toCell].sort()).toEqual([0, 1]);
  });

  it('falls back to a misplaced tile and its home cell', () => {
    const perm = [2, 1, 4, 3, 0, 5]; // single 3-cycle 0→2→4→0
    const hint = pickHint(perm, colors)!;
    expect(hint.fromCell).not.toBe(hint.toCell);
    expect(perm[hint.fromCell]).toBe(hint.toCell);
  });

  it('following hints solves any level', () => {
    const level = packLevel(3, 7);
    const perm = level.initialPerm.slice();
    let guard = 0;
    while (!isSolved(perm)) {
      const hint = pickHint(perm, level.colors)!;
      expect(hint).not.toBeNull();
      applySwap(perm, hint.fromCell, hint.toCell);
      expect(++guard).toBeLessThan(500);
    }
    expect(isSolved(perm)).toBe(true);
  });
});

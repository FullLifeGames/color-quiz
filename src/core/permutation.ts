/**
 * Board state is a permutation: perm[cell] = tileId, where tileId is the cell
 * index the tile belongs to in the solved board. Solved ⇔ perm[c] === c for all c.
 */
import { rngShuffle, type Rng } from './rng';

/**
 * Build the initial shuffle: anchors stay fixed, movable tiles are deranged
 * (no movable tile starts on its home cell).
 */
export function makeShuffle(size: number, anchors: readonly boolean[], rng: Rng): number[] {
  const perm = Array.from({ length: size }, (_, i) => i);
  const movable: number[] = [];
  for (let i = 0; i < size; i++) if (!anchors[i]) movable.push(i);
  if (movable.length < 2) return perm;

  const assigned = movable.slice();
  for (let attempt = 0; attempt < 64; attempt++) {
    rngShuffle(rng, assigned);
    if (assigned.every((tile, idx) => tile !== movable[idx])) break;
  }
  // Fix any remaining fixed points deterministically by rotating them together.
  const fixed: number[] = [];
  for (let idx = 0; idx < movable.length; idx++) {
    if (assigned[idx] === movable[idx]) fixed.push(idx);
  }
  if (fixed.length === 1) {
    const idx = fixed[0];
    const other = idx === 0 ? 1 : 0;
    [assigned[idx], assigned[other]] = [assigned[other], assigned[idx]];
  } else if (fixed.length > 1) {
    for (let k = 0; k < fixed.length; k++) {
      const next = fixed[(k + 1) % fixed.length];
      assigned[fixed[k]] = movable[next];
    }
  }
  movable.forEach((cell, idx) => (perm[cell] = assigned[idx]));
  return perm;
}

export function isSolved(perm: readonly number[]): boolean {
  return perm.every((tile, cell) => tile === cell);
}

/** Swap the tiles sitting on cells a and b (in place). */
export function applySwap(perm: number[], a: number, b: number): void {
  [perm[a], perm[b]] = [perm[b], perm[a]];
}

/** Cycle decomposition of the permutation (only cycles of length ≥ 2). */
export function cycles(perm: readonly number[]): number[][] {
  const seen = new Array(perm.length).fill(false);
  const result: number[][] = [];
  for (let start = 0; start < perm.length; start++) {
    if (seen[start] || perm[start] === start) continue;
    const cycle: number[] = [];
    let c = start;
    while (!seen[c]) {
      seen[c] = true;
      cycle.push(c);
      c = perm[c];
    }
    result.push(cycle);
  }
  return result;
}

/** Minimum number of swaps to sort the permutation. */
export function minSwaps(perm: readonly number[]): number {
  return cycles(perm).reduce((sum, cycle) => sum + cycle.length - 1, 0);
}

export function misplacedCells(perm: readonly number[]): number[] {
  const out: number[] = [];
  for (let c = 0; c < perm.length; c++) if (perm[c] !== c) out.push(c);
  return out;
}

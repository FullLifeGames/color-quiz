/**
 * Hint selection: prefer a 2-cycle (two tiles that are each other's targets,
 * so one swap fixes both), picking the pair with the largest color distance
 * (the most satisfying, most visible correction). Otherwise pick the tile
 * whose current cell color is furthest from the color that belongs there.
 */
import { okDist, toOklab } from './color';

export interface Hint {
  /** Cell where the wrongly placed tile currently sits. */
  fromCell: number;
  /** The tile's home cell (where it belongs). */
  toCell: number;
}

export function pickHint(perm: readonly number[], colors: readonly string[]): Hint | null {
  const labs = colors.map(toOklab);

  let bestPair: Hint | null = null;
  let bestPairDist = -1;
  let bestSingle: Hint | null = null;
  let bestSingleDist = -1;

  for (let cell = 0; cell < perm.length; cell++) {
    const tile = perm[cell];
    if (tile === cell) continue;
    // Distance between the tile's own color and the color that belongs on this cell.
    const wrongness = okDist(labs[tile], labs[cell]);
    if (perm[tile] === cell) {
      // 2-cycle: swapping cells `cell` and `tile` fixes both.
      if (wrongness > bestPairDist) {
        bestPairDist = wrongness;
        bestPair = { fromCell: cell, toCell: tile };
      }
    } else if (wrongness > bestSingleDist) {
      bestSingleDist = wrongness;
      bestSingle = { fromCell: cell, toCell: tile };
    }
  }
  return bestPair ?? bestSingle;
}

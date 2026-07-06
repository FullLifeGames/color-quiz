import { describe, expect, it } from 'vitest';
import chroma from 'chroma-js';
import { gridColors, makeCorners, minPairDist, okDist, prefersDarkMarker, toOklab } from './color';
import { rngFromKey } from './rng';
import { PACKS } from './packs';

describe('color', () => {
  it('okDist is 0 for identical colors and grows with difference', () => {
    const white = toOklab('#ffffff');
    expect(okDist(white, white)).toBe(0);
    expect(okDist(toOklab('#ffffff'), toOklab('#000000'))).toBeGreaterThan(0.9);
    expect(okDist(toOklab('#ff0000'), toOklab('#fe0000'))).toBeLessThan(0.01);
  });

  it('gridColors returns exact corners and correct count', () => {
    const corners = ['#ff0000', '#00ff00', '#0000ff', '#ffff00'];
    const cols = 5;
    const rows = 7;
    const grid = gridColors(corners, cols, rows);
    expect(grid).toHaveLength(cols * rows);
    expect(chroma(grid[0]).hex()).toBe(chroma(corners[0]).hex());
    expect(grid[cols - 1]).toBe(chroma(corners[1]).hex());
    expect(grid[(rows - 1) * cols]).toBe(chroma(corners[2]).hex());
    expect(grid[rows * cols - 1]).toBe(chroma(corners[3]).hex());
  });

  it('makeCorners is deterministic and produces 4 distinct colors', () => {
    for (const pack of PACKS.slice(0, 6)) {
      const a = makeCorners(rngFromKey('k'), pack.palette, 0.5);
      const b = makeCorners(rngFromKey('k'), pack.palette, 0.5);
      expect(a).toEqual(b);
      expect(a).toHaveLength(4);
      expect(minPairDist(a.map(toOklab))).toBeGreaterThan(0.05);
    }
  });

  it('minPairDist finds the closest pair', () => {
    const labs = ['#ff0000', '#ff0100', '#00ff00'].map(toOklab);
    expect(minPairDist(labs)).toBeCloseTo(okDist(labs[0], labs[1]), 10);
  });

  it('prefersDarkMarker: dark dots on light tiles, light dots on dark tiles', () => {
    expect(prefersDarkMarker('#f8f0e0')).toBe(true);
    expect(prefersDarkMarker('#1a1a30')).toBe(false);
  });
});

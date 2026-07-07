import { describe, expect, it } from 'vitest';
import { makeGeometry, SHAPES } from './geometry';

const SIZE_CLASSES: Array<[number, number]> = [
  [4, 5],
  [5, 6],
  [5, 7],
  [6, 8],
  [6, 9],
  [7, 10],
  [8, 11],
  [8, 12],
  [9, 13]
];

describe('makeGeometry', () => {
  it('yields a similar cell count for every shape (difficulty carries over)', () => {
    for (const [cols, rows] of SIZE_CLASSES) {
      const target = cols * rows;
      for (const shape of SHAPES) {
        const { cells } = makeGeometry(shape, cols, rows);
        // Diamonds are deliberately sparser (see diamondGeometry).
        const lower = shape === 'diamond' ? 0.5 : 0.7;
        expect(cells.length, `${shape} ${cols}×${rows}`).toBeGreaterThanOrEqual(target * lower);
        expect(cells.length, `${shape} ${cols}×${rows}`).toBeLessThanOrEqual(target * 1.3);
      }
    }
  });

  it('flags borders and corners on every shape', () => {
    for (const [cols, rows] of SIZE_CLASSES) {
      for (const shape of SHAPES) {
        const { cells } = makeGeometry(shape, cols, rows);
        const corners = cells.filter((c) => c.corner);
        const borders = cells.filter((c) => c.border);
        expect(corners.length, `${shape} corners`).toBeGreaterThanOrEqual(3);
        expect(borders.length, `${shape} borders`).toBeGreaterThan(corners.length);
        for (const c of corners) expect(c.border).toBe(true);
      }
    }
  });

  it('keeps all cells inside the bounding box with distinct centers', () => {
    for (const shape of SHAPES) {
      const geom = makeGeometry(shape, 6, 8);
      const seen = new Set<string>();
      for (const c of geom.cells) {
        expect(c.x).toBeGreaterThanOrEqual(-1e-9);
        expect(c.y).toBeGreaterThanOrEqual(-1e-9);
        expect(c.x + c.w).toBeLessThanOrEqual(geom.width + 1e-9);
        expect(c.y + c.h).toBeLessThanOrEqual(geom.height + 1e-9);
        expect(c.cx).toBeGreaterThan(c.x);
        expect(c.cx).toBeLessThan(c.x + c.w);
        expect(c.cy).toBeGreaterThan(c.y);
        expect(c.cy).toBeLessThan(c.y + c.h);
        const key = `${c.cx.toFixed(6)}|${c.cy.toFixed(6)}`;
        expect(seen.has(key), `duplicate center in ${shape}`).toBe(false);
        seen.add(key);
      }
    }
  });

  it('clips hex and tri cells, leaves square and diamond rectangular', () => {
    expect(makeGeometry('square', 5, 6).cells.every((c) => c.clip === null)).toBe(true);
    expect(makeGeometry('diamond', 5, 6).cells.every((c) => c.clip === null)).toBe(true);
    expect(makeGeometry('hex', 5, 6).cells.every((c) => c.clip?.startsWith('polygon('))).toBe(true);
    const tri = makeGeometry('tri', 5, 6).cells;
    expect(tri.every((c) => c.clip?.startsWith('polygon('))).toBe(true);
    // Both orientations occur.
    expect(new Set(tri.map((c) => c.clip)).size).toBe(2);
  });

  it('is deterministic', () => {
    expect(makeGeometry('diamond', 7, 10)).toEqual(makeGeometry('diamond', 7, 10));
    expect(makeGeometry('hex', 7, 10)).toEqual(makeGeometry('hex', 7, 10));
  });
});

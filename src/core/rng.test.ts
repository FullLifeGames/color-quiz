import { describe, expect, it } from 'vitest';
import { hashString, mulberry32, rngFromKey, rngInt, rngPick, rngShuffle } from './rng';

describe('rng', () => {
  it('is deterministic for the same seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 100; i++) expect(a()).toBe(b());
  });

  it('produces different streams for different seeds', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    const same = Array.from({ length: 20 }, () => a() === b()).filter(Boolean).length;
    expect(same).toBeLessThan(3);
  });

  it('stays within [0, 1)', () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const x = rng();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });

  it('hashString is stable and spreads keys', () => {
    expect(hashString('p0-l0')).toBe(hashString('p0-l0'));
    expect(hashString('p0-l0')).not.toBe(hashString('p0-l1'));
  });

  it('rngInt respects inclusive bounds', () => {
    const rng = rngFromKey('bounds');
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) {
      const v = rngInt(rng, 2, 5);
      expect(v).toBeGreaterThanOrEqual(2);
      expect(v).toBeLessThanOrEqual(5);
      seen.add(v);
    }
    expect(seen.size).toBe(4);
  });

  it('rngShuffle keeps all elements, rngPick picks members', () => {
    const rng = rngFromKey('shuffle');
    const arr = rngShuffle(rng, [1, 2, 3, 4, 5]);
    expect([...arr].sort()).toEqual([1, 2, 3, 4, 5]);
    expect([1, 2, 3]).toContain(rngPick(rng, [1, 2, 3]));
  });
});

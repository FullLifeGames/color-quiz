import { describe, expect, it } from 'vitest';
import { dailyDifficulty, dailyLevel, todayStr, zenLevel, ZEN_DIFFS } from './daily';
import { isSolved } from './permutation';

describe('daily', () => {
  it('same date yields the identical level', () => {
    const a = dailyLevel('2026-07-06');
    const b = dailyLevel('2026-07-06');
    expect(a).toBe(b);
    expect(a.colors.length).toBeGreaterThan(0);
    expect(isSolved(a.initialPerm)).toBe(false);
  });

  it('different dates yield different levels', () => {
    const a = dailyLevel('2026-07-06');
    const b = dailyLevel('2026-07-07');
    expect(a.key).not.toBe(b.key);
  });

  it('difficulty ramps Monday → Sunday', () => {
    // 2026-07-06 is a Monday.
    expect(dailyDifficulty('2026-07-06')).toBeCloseTo(0.3, 5);
    expect(dailyDifficulty('2026-07-12')).toBeCloseTo(0.85, 5);
    expect(dailyDifficulty('2026-07-09')).toBeGreaterThan(dailyDifficulty('2026-07-07'));
  });

  it('todayStr formats as YYYY-MM-DD', () => {
    expect(todayStr(new Date(2026, 6, 6))).toBe('2026-07-06');
  });

  it('zen levels are generated for every difficulty tier', () => {
    for (const diff of ZEN_DIFFS) {
      const level = zenLevel(`zen-test-${diff.id}`, diff.id);
      expect(level.colors.length).toBe(level.cols * level.rows);
      expect(isSolved(level.initialPerm)).toBe(false);
    }
    // Higher tiers use bigger boards.
    expect(zenLevel('zen-a', 3).cols * zenLevel('zen-a', 3).rows).toBeGreaterThan(
      zenLevel('zen-b', 0).cols * zenLevel('zen-b', 0).rows
    );
  });
});

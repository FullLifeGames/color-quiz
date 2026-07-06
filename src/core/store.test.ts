import { describe, expect, it } from 'vitest';
import {
  defaultSave,
  formatDate,
  GameStore,
  HINTS_MAX,
  HINTS_START,
  levelKey,
  memoryStorage,
  migrate,
  previousDay
} from './store';
import { UNLOCK_THRESHOLD } from './packs';

describe('GameStore', () => {
  it('starts with defaults and persists a roundtrip', () => {
    const storage = memoryStorage();
    const a = new GameStore(storage);
    expect(a.hints).toBe(HINTS_START);
    a.completeLevel(0, 0, 7, 3);
    const b = new GameStore(storage);
    expect(b.levelResult(0, 0)).toEqual({ stars: 3, bestMoves: 7 });
    expect(b.hints).toBe(HINTS_START + 1);
    expect(b.save.stats.levelsCompleted).toBe(1);
  });

  it('keeps the best result and only rewards the first completion', () => {
    const store = new GameStore(memoryStorage());
    store.completeLevel(0, 0, 20, 1);
    store.completeLevel(0, 0, 6, 3);
    store.completeLevel(0, 0, 30, 1);
    expect(store.levelResult(0, 0)).toEqual({ stars: 3, bestMoves: 6 });
    expect(store.hints).toBe(HINTS_START + 1);
    expect(store.save.stats.levelsCompleted).toBe(1);
  });

  it('unlocks the next pack at the threshold and reports it once', () => {
    const store = new GameStore(memoryStorage());
    expect(store.isPackUnlocked(0)).toBe(true);
    expect(store.isPackUnlocked(1)).toBe(false);
    let unlockEvents = 0;
    for (let l = 0; l < UNLOCK_THRESHOLD; l++) {
      const { unlockedPack } = store.completeLevel(0, l, 10, 2);
      if (unlockedPack !== null) {
        unlockEvents++;
        expect(unlockedPack).toBe(1);
      }
    }
    expect(unlockEvents).toBe(1);
    expect(store.isPackUnlocked(1)).toBe(true);
    expect(store.isPackUnlocked(2)).toBe(false);
  });

  it('hint economy: spend fails at 0, earn caps at max', () => {
    const store = new GameStore(memoryStorage());
    for (let i = 0; i < HINTS_START; i++) expect(store.spendHint()).toBe(true);
    expect(store.spendHint()).toBe(false);
    store.earnHints(500);
    expect(store.hints).toBe(HINTS_MAX);
  });

  it('stores and clears in-progress boards; completion clears them too', () => {
    const storage = memoryStorage();
    const store = new GameStore(storage);
    const key = levelKey(2, 5);
    store.setInProgress(key, { perm: [1, 0, 2], moves: 3, hintsUsed: 1 });
    expect(new GameStore(storage).getInProgress(key)).toEqual({ perm: [1, 0, 2], moves: 3, hintsUsed: 1 });
    store.completeLevel(2, 5, 8, 2);
    expect(store.getInProgress(key)).toBeNull();
  });

  it('daily streak: consecutive days increment, gaps reset, same day is idempotent', () => {
    const store = new GameStore(memoryStorage());
    expect(store.completeDaily('2026-07-04')).toBe(1);
    expect(store.completeDaily('2026-07-04')).toBe(1);
    expect(store.completeDaily('2026-07-05')).toBe(2);
    expect(store.completeDaily('2026-07-06')).toBe(3);
    expect(store.completeDaily('2026-07-09')).toBe(1);
    expect(store.save.daily.total).toBe(4);
    expect(store.currentStreak('2026-07-09')).toBe(1);
    expect(store.currentStreak('2026-07-10')).toBe(1);
    expect(store.currentStreak('2026-07-12')).toBe(0);
  });

  it('nextOpenLevel points at the first open task', () => {
    const store = new GameStore(memoryStorage());
    expect(store.nextOpenLevel()).toEqual({ packIdx: 0, levelIdx: 0 });
    store.completeLevel(0, 0, 5, 3);
    expect(store.nextOpenLevel()).toEqual({ packIdx: 0, levelIdx: 1 });
  });

  it('migrate tolerates garbage and clamps values', () => {
    expect(migrate(null)).toEqual(defaultSave());
    expect(migrate('nonsense')).toEqual(defaultSave());
    expect(migrate({ hints: 10_000 }).hints).toBe(HINTS_MAX);
    expect(migrate({ hints: -5 }).hints).toBe(0);
    const migrated = migrate({ settings: { sound: false } });
    expect(migrated.settings.sound).toBe(false);
    expect(migrated.settings.theme).toBe('system');
  });

  it('survives corrupted storage JSON', () => {
    const storage = memoryStorage();
    storage.setItem('chromaflow.v1', '{broken json');
    const store = new GameStore(storage);
    expect(store.hints).toBe(HINTS_START);
  });

  it('resetAll wipes progress', () => {
    const storage = memoryStorage();
    const store = new GameStore(storage);
    store.completeLevel(0, 0, 5, 3);
    store.resetAll();
    expect(store.levelResult(0, 0)).toBeNull();
    expect(store.hints).toBe(HINTS_START);
  });
});

describe('date helpers', () => {
  it('previousDay handles month and year boundaries', () => {
    expect(previousDay('2026-07-06')).toBe('2026-07-05');
    expect(previousDay('2026-07-01')).toBe('2026-06-30');
    expect(previousDay('2026-01-01')).toBe('2025-12-31');
    expect(previousDay('2026-03-01')).toBe('2026-02-28');
  });

  it('formatDate pads correctly', () => {
    expect(formatDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

/** Daily puzzle: one deterministic level per calendar day. */
import { generateLevel, type Level } from './level';
import { hashString } from './rng';
import { PACKS } from './packs';
import { formatDate } from './store';

export function todayStr(now: Date = new Date()): string {
  return formatDate(now);
}

/** Difficulty ramps across the week: Monday gentle, Sunday tough. */
export function dailyDifficulty(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  const weekday = (new Date(y, m - 1, d, 12).getDay() + 6) % 7; // Mo=0 … So=6
  return 0.3 + weekday * (0.55 / 6);
}

export function dailyLevel(dateStr: string): Level {
  const paletteIdx = hashString(`daily-palette-${dateStr}`) % PACKS.length;
  return generateLevel(`daily-${dateStr}`, dailyDifficulty(dateStr), PACKS[paletteIdx].palette);
}

/** Zen mode: endless levels at a chosen difficulty. */
export const ZEN_DIFFS = [
  { id: 0, d: 0.15 },
  { id: 1, d: 0.45 },
  { id: 2, d: 0.7 },
  { id: 3, d: 0.92 }
] as const;

export function zenLevel(seedKey: string, diffId: number): Level {
  const zen = ZEN_DIFFS[Math.max(0, Math.min(ZEN_DIFFS.length - 1, diffId))];
  const paletteIdx = hashString(`zen-palette-${seedKey}`) % PACKS.length;
  return generateLevel(seedKey, zen.d, PACKS[paletteIdx].palette);
}

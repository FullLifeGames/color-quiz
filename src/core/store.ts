/** Persistent game state in LocalStorage (versioned, with in-memory fallback). */
import { LEVELS_PER_PACK, PACKS, UNLOCK_THRESHOLD } from './packs';

export interface LevelResult {
  stars: 1 | 2 | 3;
  bestMoves: number;
}

export interface InProgress {
  perm: number[];
  moves: number;
  hintsUsed: number;
  /** Zen only: parameters to regenerate the level. */
  seedKey?: string;
  zenDiff?: number;
}

export interface Settings {
  sound: boolean;
  theme: 'system' | 'light' | 'dark';
  lang: 'auto' | 'de' | 'en';
  assist: boolean;
}

export interface SaveData {
  version: 1;
  hints: number;
  settings: Settings;
  packs: Record<string, Record<string, LevelResult>>;
  inProgress: Record<string, InProgress>;
  daily: { lastDate: string | null; streak: number; total: number };
  stats: { levelsCompleted: number; totalMoves: number; totalStars: number; zenCompleted: number };
  lastPlayed: { packIdx: number; levelIdx: number } | null;
}

export const HINTS_START = 10;
export const HINT_REWARD = 1;
export const HINTS_MAX = 99;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function memoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k)
  };
}

export function defaultSave(): SaveData {
  return {
    version: 1,
    hints: HINTS_START,
    settings: { sound: true, theme: 'system', lang: 'auto', assist: false },
    packs: {},
    inProgress: {},
    daily: { lastDate: null, streak: 0, total: 0 },
    stats: { levelsCompleted: 0, totalMoves: 0, totalStars: 0, zenCompleted: 0 },
    lastPlayed: null
  };
}

/** Merge unknown/older payloads onto a fresh default (defensive migration). */
export function migrate(raw: unknown): SaveData {
  const save = defaultSave();
  if (!raw || typeof raw !== 'object') return save;
  const r = raw as Partial<SaveData>;
  if (typeof r.hints === 'number' && isFinite(r.hints)) {
    save.hints = Math.max(0, Math.min(HINTS_MAX, Math.floor(r.hints)));
  }
  if (r.settings && typeof r.settings === 'object') Object.assign(save.settings, r.settings);
  if (r.packs && typeof r.packs === 'object') save.packs = r.packs as SaveData['packs'];
  if (r.inProgress && typeof r.inProgress === 'object') save.inProgress = r.inProgress as SaveData['inProgress'];
  if (r.daily && typeof r.daily === 'object') Object.assign(save.daily, r.daily);
  if (r.stats && typeof r.stats === 'object') Object.assign(save.stats, r.stats);
  if (r.lastPlayed && typeof r.lastPlayed === 'object') save.lastPlayed = r.lastPlayed;
  return save;
}

export class GameStore {
  private data: SaveData;

  constructor(
    private storage: StorageLike,
    private key = 'chromaflow.v1'
  ) {
    let raw: unknown = null;
    try {
      const str = storage.getItem(key);
      if (str) raw = JSON.parse(str);
    } catch {
      raw = null;
    }
    this.data = migrate(raw);
  }

  get save(): SaveData {
    return this.data;
  }

  private persist(): void {
    try {
      this.storage.setItem(this.key, JSON.stringify(this.data));
    } catch {
      // Storage full or unavailable — keep playing in memory.
    }
  }

  // --- progression ---------------------------------------------------------

  levelResult(packIdx: number, levelIdx: number): LevelResult | null {
    return this.data.packs[packIdx]?.[levelIdx] ?? null;
  }

  completedInPack(packIdx: number): number {
    return Object.keys(this.data.packs[packIdx] ?? {}).length;
  }

  isPackUnlocked(packIdx: number): boolean {
    if (packIdx <= 0) return true;
    if (packIdx >= PACKS.length) return false;
    return this.completedInPack(packIdx - 1) >= UNLOCK_THRESHOLD;
  }

  /**
   * Record a completed level. Returns the new result plus whether this
   * completion unlocked the next pack.
   */
  completeLevel(
    packIdx: number,
    levelIdx: number,
    moves: number,
    stars: 1 | 2 | 3
  ): { result: LevelResult; unlockedPack: number | null } {
    const wasUnlocked = this.isPackUnlocked(packIdx + 1);
    const pack = (this.data.packs[packIdx] ??= {});
    const prev = pack[levelIdx];
    const firstTime = !prev;
    const result: LevelResult = {
      stars: Math.max(prev?.stars ?? 1, stars) as 1 | 2 | 3,
      bestMoves: Math.min(prev?.bestMoves ?? Infinity, moves)
    };
    pack[levelIdx] = result;
    this.data.stats.totalMoves += moves;
    if (firstTime) {
      this.data.stats.levelsCompleted += 1;
      this.earnHints(HINT_REWARD);
    }
    this.data.stats.totalStars = this.recountStars();
    this.clearInProgress(levelKey(packIdx, levelIdx));
    this.persist();
    const unlockedPack =
      !wasUnlocked && packIdx + 1 < PACKS.length && this.isPackUnlocked(packIdx + 1) ? packIdx + 1 : null;
    return { result, unlockedPack };
  }

  private recountStars(): number {
    let total = 0;
    for (const pack of Object.values(this.data.packs)) {
      for (const res of Object.values(pack)) total += res.stars;
    }
    return total;
  }

  totalCompleted(): number {
    return Object.values(this.data.packs).reduce((sum, pack) => sum + Object.keys(pack).length, 0);
  }

  // --- hints ---------------------------------------------------------------

  get hints(): number {
    return this.data.hints;
  }

  spendHint(): boolean {
    if (this.data.hints <= 0) return false;
    this.data.hints -= 1;
    this.persist();
    return true;
  }

  earnHints(n: number): void {
    this.data.hints = Math.min(HINTS_MAX, this.data.hints + n);
    this.persist();
  }

  // --- in-progress boards --------------------------------------------------

  getInProgress(key: string): InProgress | null {
    return this.data.inProgress[key] ?? null;
  }

  setInProgress(key: string, state: InProgress): void {
    this.data.inProgress[key] = state;
    this.persist();
  }

  clearInProgress(key: string): void {
    delete this.data.inProgress[key];
    this.persist();
  }

  // --- daily ---------------------------------------------------------------

  /** Record today's daily as completed; returns the updated streak. */
  completeDaily(dateStr: string): number {
    const d = this.data.daily;
    if (d.lastDate === dateStr) return d.streak;
    d.streak = d.lastDate === previousDay(dateStr) ? d.streak + 1 : 1;
    d.lastDate = dateStr;
    d.total += 1;
    this.earnHints(HINT_REWARD);
    this.clearInProgress(`daily-${dateStr}`);
    this.persist();
    return d.streak;
  }

  isDailyDone(dateStr: string): boolean {
    return this.data.daily.lastDate === dateStr;
  }

  /** Current streak, counting a not-yet-played today as still alive. */
  currentStreak(todayStr: string): number {
    const d = this.data.daily;
    if (d.lastDate === todayStr || d.lastDate === previousDay(todayStr)) return d.streak;
    return 0;
  }

  completeZen(moves: number): void {
    this.data.stats.zenCompleted += 1;
    this.data.stats.totalMoves += moves;
    this.clearInProgress('zen');
    this.persist();
  }

  // --- settings / misc -----------------------------------------------------

  get settings(): Settings {
    return this.data.settings;
  }

  updateSettings(patch: Partial<Settings>): void {
    Object.assign(this.data.settings, patch);
    this.persist();
  }

  setLastPlayed(packIdx: number, levelIdx: number): void {
    this.data.lastPlayed = { packIdx, levelIdx };
    this.persist();
  }

  /** First not-yet-completed level in the furthest unlocked pack. */
  nextOpenLevel(): { packIdx: number; levelIdx: number } {
    for (let p = PACKS.length - 1; p >= 0; p--) {
      if (!this.isPackUnlocked(p)) continue;
      for (let l = 0; l < LEVELS_PER_PACK; l++) {
        if (!this.levelResult(p, l)) return { packIdx: p, levelIdx: l };
      }
      // Pack fully done — try the next one (if unlocked), else this pack's last level.
      if (p + 1 < PACKS.length && this.isPackUnlocked(p + 1)) continue;
      return { packIdx: p, levelIdx: LEVELS_PER_PACK - 1 };
    }
    return { packIdx: 0, levelIdx: 0 };
  }

  resetAll(): void {
    this.data = defaultSave();
    try {
      this.storage.removeItem(this.key);
    } catch {
      // ignore
    }
    this.persist();
  }
}

export function levelKey(packIdx: number, levelIdx: number): string {
  return `p${packIdx}-l${levelIdx}`;
}

/** dateStr is YYYY-MM-DD (local); returns the previous calendar day. */
export function previousDay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d - 1, 12);
  return formatDate(date);
}

export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

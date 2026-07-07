/** Game screen: header, board, controls (peek / hint / restart), win overlay. */
import type { AppContext, Screen } from './app';
import { packLevel, starsFor, type Level } from '../core/level';
import { LEVELS_PER_PACK, PACKS } from '../core/packs';
import { levelKey, type InProgress } from '../core/store';
import { dailyLevel, todayStr, zenLevel } from '../core/daily';
import { pickHint } from '../core/hints';
import { BoardView } from './board';
import { getLang, t, WIN_LINES } from './i18n';
import { icons } from './icons';
import { sfx } from './sound';

export type GameMode =
  | { kind: 'pack'; packIdx: number; levelIdx: number }
  | { kind: 'daily' }
  | { kind: 'zen'; diff: number };

function h(html: string): HTMLElement {
  const tpl = document.createElement('template');
  tpl.innerHTML = html.trim();
  return tpl.content.firstElementChild as HTMLElement;
}

interface ModeSetup {
  level: Level;
  progressKey: string;
  title: string;
  subtitle: string;
  backHash: string;
  zenSeedKey?: string;
}

function setupMode(ctx: AppContext, mode: GameMode): ModeSetup {
  const lang = getLang();
  if (mode.kind === 'pack') {
    const level = packLevel(mode.packIdx, mode.levelIdx);
    return {
      level,
      progressKey: levelKey(mode.packIdx, mode.levelIdx),
      title: PACKS[mode.packIdx].name[lang],
      subtitle: t('common.level', { n: mode.levelIdx + 1 }),
      backHash: `#/pack/${mode.packIdx}`
    };
  }
  if (mode.kind === 'daily') {
    const date = todayStr();
    return {
      level: dailyLevel(date),
      progressKey: `daily-${date}`,
      title: t('home.daily'),
      subtitle: date,
      backHash: '#/'
    };
  }
  // Zen: reuse the stored seed when a board is in progress, else roll a new one.
  const stored = ctx.store.getInProgress('zen');
  const seedKey =
    stored && stored.zenDiff === mode.diff && stored.seedKey
      ? stored.seedKey
      : `zen-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
  return {
    level: zenLevel(seedKey, mode.diff),
    progressKey: 'zen',
    title: t('zen.title'),
    subtitle: [t('zen.d0'), t('zen.d1'), t('zen.d2'), t('zen.d3')][mode.diff],
    backHash: '#/',
    zenSeedKey: seedKey
  };
}

export function gameScreen(ctx: AppContext, mode: GameMode): Screen {
  const { store } = ctx;
  const setup = setupMode(ctx, mode);
  const { level, progressKey } = setup;
  const size = level.geom.cells.length;

  if (mode.kind === 'pack') store.setLastPlayed(mode.packIdx, mode.levelIdx);

  const stored = store.getInProgress(progressKey);
  const validStored =
    stored &&
    stored.perm.length === size &&
    (mode.kind !== 'zen' || (stored.zenDiff === mode.diff && stored.seedKey === setup.zenSeedKey))
      ? stored
      : null;
  let hintsUsed = validStored?.hintsUsed ?? 0;

  const el = h(`
    <div class="screen game" data-testid="game-screen">
      <header class="bar">
        <button class="icon-btn" data-testid="back-btn" aria-label="${t('common.back')}">${icons.back}</button>
        <div class="bar-title">
          <strong>${setup.title}</strong>
          <small>${setup.subtitle}</small>
        </div>
        <div class="moves-box" data-testid="moves-box">
          <strong data-testid="moves">${validStored?.moves ?? 0}</strong>
          <small>${t('game.moves')}</small>
        </div>
      </header>
      <div class="board-area" data-testid="board-area"></div>
      <footer class="controls">
        <button class="ctl-btn" data-testid="peek-btn" aria-label="${t('game.peek')}" title="${t('game.peek')}">
          ${icons.eye}
        </button>
        <button class="ctl-btn" data-testid="hint-btn" aria-label="${t('game.hint', { n: store.hints })}"
          title="${t('game.hint', { n: store.hints })}">
          ${icons.bulb}<span class="badge" data-testid="hint-count">${store.hints}</span>
        </button>
        <button class="ctl-btn" data-testid="restart-btn" aria-label="${t('game.restart')}" title="${t('game.restart')}">
          ${icons.restart}
        </button>
      </footer>
    </div>
  `);

  const movesEl = el.querySelector('[data-testid="moves"]')!;
  const boardArea = el.querySelector<HTMLElement>('.board-area')!;

  const saveProgress = (perm: readonly number[], moves: number): void => {
    const state: InProgress = { perm: [...perm], moves, hintsUsed };
    if (mode.kind === 'zen') {
      state.seedKey = setup.zenSeedKey;
      state.zenDiff = mode.diff;
    }
    store.setInProgress(progressKey, state);
  };

  const board = new BoardView(
    boardArea,
    level,
    {
      restorePerm: validStored?.perm,
      restoreMoves: validStored?.moves,
      assist: store.settings.assist,
      skipIntro: !!validStored,
      testMode: ctx.testMode
    },
    {
      sfx,
      onMove(perm, moves) {
        movesEl.textContent = String(moves);
        saveProgress(perm, moves);
      },
      onWin(moves) {
        void showWin(moves);
      }
    }
  );

  // --- controls -------------------------------------------------------------

  el.querySelector('[data-testid="back-btn"]')!.addEventListener('click', () => ctx.navigate(setup.backHash));

  const peekBtn = el.querySelector<HTMLButtonElement>('[data-testid="peek-btn"]')!;
  const peekOff = (): void => board.setPeek(false);
  peekBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    board.setPeek(true);
  });
  peekBtn.addEventListener('pointerup', peekOff);
  peekBtn.addEventListener('pointerleave', peekOff);
  peekBtn.addEventListener('pointercancel', peekOff);
  peekBtn.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') board.setPeek(true);
  });
  peekBtn.addEventListener('keyup', peekOff);

  const hintBtn = el.querySelector<HTMLButtonElement>('[data-testid="hint-btn"]')!;
  const hintCount = el.querySelector('[data-testid="hint-count"]')!;
  hintBtn.addEventListener('click', () => {
    if (!board.isReady) return;
    const hint = pickHint(board.currentPerm, level.colors);
    if (!hint) return;
    if (!store.spendHint()) {
      ctx.toast(t('game.noHints'));
      sfx.denied();
      return;
    }
    hintsUsed += 1;
    hintCount.textContent = String(store.hints);
    saveProgress(board.currentPerm, board.currentMoves);
    board.showHint(hint);
    sfx.hint();
  });

  const restartBtn = el.querySelector<HTMLButtonElement>('[data-testid="restart-btn"]')!;
  let restartArmed = false;
  restartBtn.addEventListener('click', () => {
    if (!board.isReady) return;
    if (!restartArmed) {
      restartArmed = true;
      restartBtn.classList.add('armed');
      restartBtn.title = t('game.restartConfirm');
      window.setTimeout(() => {
        restartArmed = false;
        restartBtn.classList.remove('armed');
        restartBtn.title = t('game.restart');
      }, 3000);
      return;
    }
    restartArmed = false;
    restartBtn.classList.remove('armed');
    board.restart();
  });

  // --- win ------------------------------------------------------------------

  async function showWin(moves: number): Promise<void> {
    sfx.win();
    if (!ctx.testMode) {
      try {
        const { default: confetti } = await import('canvas-confetti');
        confetti({ particleCount: 110, spread: 75, origin: { y: 0.6 }, disableForReducedMotion: true });
      } catch {
        // effect only — never block the win flow
      }
    }

    const stars = starsFor(moves, level.par);
    const lines = WIN_LINES[getLang()];
    const line = lines[(moves * 7 + level.colors.length) % lines.length];

    let headline = line;
    let extra = '';
    let buttons = '';

    if (mode.kind === 'pack') {
      const prevBest = store.levelResult(mode.packIdx, mode.levelIdx)?.bestMoves;
      const { unlockedPack } = store.completeLevel(mode.packIdx, mode.levelIdx, moves, stars);
      if (unlockedPack !== null) ctx.toast(t('win.unlocked', { pack: PACKS[unlockedPack].name[getLang()] }));
      const isLast = mode.levelIdx + 1 >= LEVELS_PER_PACK;
      if (isLast) headline = t('win.packDone');
      const best = Math.min(prevBest ?? Infinity, moves);
      extra = `<p class="win-best">${t('win.best', { n: best })}</p>`;
      buttons = `
        <button class="btn" data-testid="win-again">${t('win.again')}</button>
        <button class="btn" data-testid="win-list">${t('win.list')}</button>
        ${isLast ? '' : `<button class="btn primary" data-testid="win-next">${t('win.next')}</button>`}
      `;
    } else if (mode.kind === 'daily') {
      const streak = store.completeDaily(todayStr());
      extra = `<p class="win-best flame-line">${icons.flame} ${t('win.streak', { n: streak })}</p>`;
      buttons = `<button class="btn primary" data-testid="win-home">${t('win.home')}</button>`;
    } else {
      store.completeZen(moves);
      buttons = `
        <button class="btn" data-testid="win-home">${t('win.home')}</button>
        <button class="btn primary" data-testid="win-zen-next">${t('win.zenNext')}</button>
      `;
    }

    const overlay = h(`
      <div class="win-overlay" data-testid="win-overlay">
        <div class="win-card">
          <div class="win-stars" data-testid="win-stars" data-stars="${stars}">
            ${[0, 1, 2]
              .map((i) => `<span class="star big ${i < stars ? 'on' : ''}" style="animation-delay:${200 + i * 180}ms">${icons.starFill}</span>`)
              .join('')}
          </div>
          <h2 class="win-line">${headline}</h2>
          <p class="win-moves" data-testid="win-moves">${t('win.moves', { moves, goal: level.goal })}</p>
          ${extra}
          <div class="win-buttons">${buttons}</div>
        </div>
      </div>
    `);

    overlay.querySelector('[data-testid="win-again"]')?.addEventListener('click', () => {
      overlay.remove();
      board.restart();
    });
    overlay.querySelector('[data-testid="win-list"]')?.addEventListener('click', () => ctx.navigate(setup.backHash));
    overlay.querySelector('[data-testid="win-next"]')?.addEventListener('click', () => {
      if (mode.kind === 'pack') ctx.navigate(`#/play/${mode.packIdx}/${mode.levelIdx + 1}`);
    });
    overlay.querySelector('[data-testid="win-home"]')?.addEventListener('click', () => ctx.navigate('#/'));
    overlay.querySelector('[data-testid="win-zen-next"]')?.addEventListener('click', () => {
      if (mode.kind === 'zen') {
        store.clearInProgress('zen');
        ctx.refresh();
      }
    });

    el.appendChild(overlay);
    hintCount.textContent = String(store.hints);
  }

  return {
    el,
    destroy() {
      board.destroy();
    }
  };
}

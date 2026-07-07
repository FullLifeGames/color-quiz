/** Home screen, pack (level select) screen, settings & zen modals. */
import type { AppContext, Screen } from './app';
import { LEVELS_PER_PACK, levelPalette, PACKS, UNLOCK_THRESHOLD } from '../core/packs';
import { paletteStops, paletteSwatch } from '../core/color';
import { levelKey } from '../core/store';
import { todayStr } from '../core/daily';
import { getLang, t } from './i18n';
import { icons } from './icons';

function h(html: string): HTMLElement {
  const tpl = document.createElement('template');
  tpl.innerHTML = html.trim();
  return tpl.content.firstElementChild as HTMLElement;
}

function starRow(stars: number, max = 3): string {
  let out = '<span class="stars" aria-hidden="true">';
  for (let i = 0; i < max; i++) out += `<span class="star ${i < stars ? 'on' : ''}">${icons.starFill}</span>`;
  return out + '</span>';
}

// --- home -------------------------------------------------------------------

export function homeScreen(ctx: AppContext): Screen {
  const { store } = ctx;
  const today = todayStr();
  const streak = store.currentStreak(today);
  const dailyDone = store.isDailyDone(today);
  const next = store.nextOpenLevel();
  const totalDone = store.totalCompleted();

  const el = h(`
    <div class="screen home" data-testid="home">
      <header class="hero">
        <div class="hero-text">
          <h1>${t('app.title')}</h1>
          <p>${t('app.tagline')}</p>
        </div>
        <button class="icon-btn" data-testid="settings-btn" aria-label="${t('home.settings')}">${icons.gear}</button>
      </header>
      <div class="cards">
        <button class="card action" data-testid="continue-btn">
          <span class="card-icon">${icons.play}</span>
          <span class="card-body">
            <strong>${t('home.continue')}</strong>
            <small>${PACKS[next.packIdx].name[getLang()]} · ${t('common.level', { n: next.levelIdx + 1 })}</small>
          </span>
        </button>
        <button class="card action" data-testid="daily-btn">
          <span class="card-icon">${icons.calendar}</span>
          <span class="card-body">
            <strong>${t('home.daily')}</strong>
            <small>${dailyDone ? `${t('home.dailyDone')} ✓` : today}</small>
          </span>
          ${streak > 0 ? `<span class="badge flame">${icons.flame}${streak}</span>` : ''}
        </button>
        <button class="card action" data-testid="zen-btn">
          <span class="card-icon">${icons.infinity}</span>
          <span class="card-body">
            <strong>${t('home.zen')}</strong>
            <small>${t('home.zenSub')}</small>
          </span>
        </button>
      </div>
      <h2>${t('home.packs')}</h2>
      <div class="packs" data-testid="packs"></div>
      <footer class="home-stats" data-testid="stats">
        ${t('home.statsLevels', { n: totalDone })} · ${t('home.statsStars', { n: store.save.stats.totalStars })}
      </footer>
    </div>
  `);

  el.querySelector('[data-testid="settings-btn"]')!.addEventListener('click', () => openSettings(ctx));
  el.querySelector('[data-testid="continue-btn"]')!.addEventListener('click', () =>
    ctx.navigate(`#/play/${next.packIdx}/${next.levelIdx}`)
  );
  el.querySelector('[data-testid="daily-btn"]')!.addEventListener('click', () => ctx.navigate('#/daily'));
  el.querySelector('[data-testid="zen-btn"]')!.addEventListener('click', () => openZenPicker(ctx));

  const packsEl = el.querySelector('.packs')!;
  PACKS.forEach((pack, idx) => {
    const unlocked = store.isPackUnlocked(idx);
    const done = store.completedInPack(idx);
    const stops = paletteStops(pack.palette);
    const card = h(`
      <button class="pack-card ${unlocked ? '' : 'locked'}" data-testid="pack-card" data-pack="${idx}"
        style="--pack-grad: linear-gradient(135deg, ${stops.join(', ')})">
        <span class="pack-name">${pack.name[getLang()]}</span>
        ${
          unlocked
            ? `<span class="pack-progress">${done}/${LEVELS_PER_PACK}</span>
               <span class="pack-bar"><span style="width:${(done / LEVELS_PER_PACK) * 100}%"></span></span>`
            : `<span class="pack-lock">${icons.lock}</span>
               <span class="pack-progress small">${t('pack.lockedHint', {
                 n: UNLOCK_THRESHOLD,
                 pack: PACKS[idx - 1]?.name[getLang()] ?? ''
               })}</span>`
        }
      </button>
    `);
    card.addEventListener('click', () => {
      if (unlocked) ctx.navigate(`#/pack/${idx}`);
      else ctx.toast(t('pack.lockedHint', { n: UNLOCK_THRESHOLD, pack: PACKS[idx - 1]?.name[getLang()] ?? '' }));
    });
    packsEl.appendChild(card);
  });

  return { el };
}

// --- pack / level select ------------------------------------------------------

export function packScreen(ctx: AppContext, packIdx: number): Screen {
  const { store } = ctx;
  const pack = PACKS[packIdx];
  const done = store.completedInPack(packIdx);

  const el = h(`
    <div class="screen pack" data-testid="pack-screen">
      <header class="bar">
        <button class="icon-btn" data-testid="back-btn" aria-label="${t('common.back')}">${icons.back}</button>
        <div class="bar-title">
          <strong>${pack.name[getLang()]}</strong>
          <small>${done}/${LEVELS_PER_PACK}</small>
        </div>
        <span class="bar-spacer"></span>
      </header>
      <div class="levels" data-testid="levels"></div>
    </div>
  `);

  el.querySelector('[data-testid="back-btn"]')!.addEventListener('click', () => ctx.navigate('#/'));

  const grid = el.querySelector('.levels')!;
  for (let l = 0; l < LEVELS_PER_PACK; l++) {
    const res = store.levelResult(packIdx, l);
    const inProgress = !!store.getInProgress(levelKey(packIdx, l));
    const bg = paletteSwatch(levelPalette(packIdx, l), 0.5);
    const btn = h(`
      <button class="level-btn ${res ? 'done' : ''} ${inProgress ? 'progress' : ''}"
        data-testid="level-btn" data-level="${l}" style="--lvl-bg:${bg}"
        aria-label="${t('common.level', { n: l + 1 })}">
        <span class="lvl-num">${l + 1}</span>
        ${res ? starRow(res.stars) : ''}
      </button>
    `);
    btn.addEventListener('click', () => ctx.navigate(`#/play/${packIdx}/${l}`));
    grid.appendChild(btn);
  }

  return { el };
}

// --- modals -------------------------------------------------------------------

function openModal(inner: HTMLElement, onClose?: () => void): () => void {
  const backdrop = h('<div class="modal-backdrop"></div>');
  backdrop.appendChild(inner);
  const close = (): void => {
    backdrop.remove();
    onClose?.();
  };
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });
  document.body.appendChild(backdrop);
  return close;
}

export function openZenPicker(ctx: AppContext): void {
  const inner = h(`
    <div class="modal" data-testid="zen-modal">
      <h3>${t('zen.title')}</h3>
      <p class="modal-sub">${t('zen.pick')}</p>
      <div class="zen-options"></div>
    </div>
  `);
  const options = inner.querySelector('.zen-options')!;
  const labels = [t('zen.d0'), t('zen.d1'), t('zen.d2'), t('zen.d3')];
  labels.forEach((label, i) => {
    const btn = h(
      `<button class="btn zen-option" data-testid="zen-diff" data-diff="${i}"
         style="--lvl-bg:${paletteSwatch(PACKS[(i * 7 + 2) % PACKS.length].palette, 0.5)}">${label}</button>`
    );
    btn.addEventListener('click', () => {
      close();
      ctx.navigate(`#/zen/${i}`);
    });
    options.appendChild(btn);
  });
  const close = openModal(inner);
}

export function openSettings(ctx: AppContext): void {
  const { store } = ctx;
  const s = store.settings;

  const segment = (
    name: string,
    values: Array<{ v: string; label: string }>,
    current: string
  ): string => `
    <div class="segment" data-setting="${name}">
      ${values
        .map(
          ({ v, label }) =>
            `<button class="seg-btn ${v === current ? 'on' : ''}" data-value="${v}">${label}</button>`
        )
        .join('')}
    </div>`;

  const toggle = (name: string, on: boolean): string =>
    `<button class="switch ${on ? 'on' : ''}" role="switch" aria-checked="${on}" data-setting="${name}"><span></span></button>`;

  const inner = h(`
    <div class="modal settings" data-testid="settings-modal">
      <div class="modal-head">
        <h3>${t('settings.title')}</h3>
        <button class="icon-btn" data-testid="close-settings" aria-label="${t('common.close')}">✕</button>
      </div>
      <div class="setting-row"><span>${t('settings.sound')}</span>${toggle('sound', s.sound)}</div>
      <div class="setting-row"><span>${t('settings.theme')}</span>${segment('theme', [
        { v: 'system', label: t('settings.theme.system') },
        { v: 'light', label: t('settings.theme.light') },
        { v: 'dark', label: t('settings.theme.dark') }
      ], s.theme)}</div>
      <div class="setting-row"><span>${t('settings.lang')}</span>${segment('lang', [
        { v: 'auto', label: t('settings.lang.auto') },
        { v: 'de', label: 'DE' },
        { v: 'en', label: 'EN' }
      ], s.lang)}</div>
      <div class="setting-row col">
        <div class="setting-row inner"><span>${t('settings.assist')}</span>${toggle('assist', s.assist)}</div>
        <small>${t('settings.assistSub')}</small>
      </div>
      <div class="setting-row">
        <button class="btn danger" data-testid="reset-btn">${t('settings.reset')}</button>
      </div>
      <p class="about">${t('settings.about')}</p>
    </div>
  `);

  const close = openModal(inner, () => ctx.refresh());
  inner.querySelector('[data-testid="close-settings"]')!.addEventListener('click', () => close());

  inner.querySelectorAll<HTMLButtonElement>('.switch').forEach((sw) => {
    sw.addEventListener('click', () => {
      const name = sw.dataset.setting as 'sound' | 'assist';
      const on = !sw.classList.contains('on');
      sw.classList.toggle('on', on);
      sw.setAttribute('aria-checked', String(on));
      store.updateSettings({ [name]: on });
      ctx.applySettings();
    });
  });

  inner.querySelectorAll<HTMLElement>('.segment').forEach((seg) => {
    seg.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.seg-btn');
      if (!btn) return;
      seg.querySelectorAll('.seg-btn').forEach((b) => b.classList.remove('on'));
      btn.classList.add('on');
      const name = seg.dataset.setting as 'theme' | 'lang';
      store.updateSettings({ [name]: btn.dataset.value } as never);
      ctx.applySettings();
    });
  });

  const resetBtn = inner.querySelector<HTMLButtonElement>('[data-testid="reset-btn"]')!;
  let armed = false;
  resetBtn.addEventListener('click', () => {
    if (!armed) {
      armed = true;
      resetBtn.textContent = t('settings.resetConfirm');
      window.setTimeout(() => {
        armed = false;
        resetBtn.textContent = t('settings.reset');
      }, 4000);
      return;
    }
    store.resetAll();
    close();
    ctx.navigate('#/');
    ctx.refresh();
  });
}

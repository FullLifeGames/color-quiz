/** App shell: hash router, theme, toasts, shared context. */
import { GameStore, memoryStorage, type StorageLike } from '../core/store';
import { resolveLang, setLang } from './i18n';
import { setSoundEnabled } from './sound';
import { homeScreen, packScreen } from './screens';
import { gameScreen, type GameMode } from './game';

export interface Screen {
  el: HTMLElement;
  destroy?(): void;
}

export interface AppContext {
  store: GameStore;
  root: HTMLElement;
  testMode: boolean;
  navigate(hash: string): void;
  /** Re-render the current route (after settings changes etc.). */
  refresh(): void;
  toast(msg: string): void;
  applySettings(): void;
}

function browserStorage(): StorageLike {
  try {
    const probe = '__chromaflow_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return memoryStorage();
  }
}

export function createApp(root: HTMLElement): AppContext {
  const store = new GameStore(browserStorage());
  const testMode = !!navigator.webdriver;
  if (testMode) document.documentElement.dataset.test = '1';

  let current: Screen | null = null;

  const media = window.matchMedia('(prefers-color-scheme: dark)');

  const ctx: AppContext = {
    store,
    root,
    testMode,
    navigate(hash: string) {
      if (location.hash === hash) render();
      else location.hash = hash;
    },
    refresh: () => render(),
    toast(msg: string) {
      const el = document.createElement('div');
      el.className = 'toast';
      el.textContent = msg;
      document.body.appendChild(el);
      window.setTimeout(() => el.classList.add('show'), 20);
      window.setTimeout(() => {
        el.classList.remove('show');
        window.setTimeout(() => el.remove(), 400);
      }, 2600);
    },
    applySettings() {
      const { settings } = store;
      setSoundEnabled(settings.sound);
      setLang(resolveLang(settings.lang));
      const resolved = settings.theme === 'system' ? (media.matches ? 'dark' : 'light') : settings.theme;
      document.documentElement.dataset.theme = resolved;
    }
  };

  media.addEventListener('change', () => {
    if (store.settings.theme === 'system') ctx.applySettings();
  });

  function route(): Screen {
    const hash = location.hash.replace(/^#\/?/, '');
    const parts = hash.split('/').filter(Boolean);
    if (parts[0] === 'pack') {
      const packIdx = Number(parts[1]);
      if (Number.isInteger(packIdx) && store.isPackUnlocked(packIdx)) return packScreen(ctx, packIdx);
    } else if (parts[0] === 'play') {
      const packIdx = Number(parts[1]);
      const levelIdx = Number(parts[2]);
      if (Number.isInteger(packIdx) && Number.isInteger(levelIdx) && store.isPackUnlocked(packIdx)) {
        const mode: GameMode = { kind: 'pack', packIdx, levelIdx };
        return gameScreen(ctx, mode);
      }
    } else if (parts[0] === 'daily') {
      return gameScreen(ctx, { kind: 'daily' });
    } else if (parts[0] === 'zen') {
      const diff = Number(parts[1]);
      if (Number.isInteger(diff) && diff >= 0 && diff <= 3) return gameScreen(ctx, { kind: 'zen', diff });
    }
    return homeScreen(ctx);
  }

  function render(): void {
    current?.destroy?.();
    root.replaceChildren();
    ctx.applySettings();
    current = route();
    root.appendChild(current.el);
    window.scrollTo(0, 0);
  }

  window.addEventListener('hashchange', render);
  render();
  return ctx;
}

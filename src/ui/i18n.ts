/** Tiny i18n: German (default for de-* browsers) and English. */

export type Lang = 'de' | 'en';

const de = {
  'app.title': 'ChromaFlow',
  'app.tagline': 'Bring die Farben ins Gleichgewicht.',
  'home.continue': 'Weiterspielen',
  'home.daily': 'Tägliches Puzzle',
  'home.dailyDone': 'Heute gelöst',
  'home.streak': '{n} Tage in Serie',
  'home.zen': 'Zen-Modus',
  'home.zenSub': 'Endlose Level in deinem Tempo',
  'home.packs': 'Level-Pakete',
  'home.statsLevels': '{n} Level gelöst',
  'home.statsStars': '{n} Sterne',
  'home.settings': 'Einstellungen',
  'pack.lockedHint': 'Löse {n} Level in „{pack}“',
  'pack.locked': 'Gesperrt',
  'common.back': 'Zurück',
  'common.close': 'Schließen',
  'common.level': 'Level {n}',
  'game.moves': 'Züge',
  'game.restart': 'Neu starten',
  'game.restartConfirm': 'Sicher?',
  'game.hint': 'Tipp anzeigen ({n} übrig)',
  'game.noHints': 'Keine Tipps mehr — gelöste Level bringen neue.',
  'game.peek': 'Lösung ansehen (halten)',
  'game.anchorLocked': 'Diese Kachel ist fixiert',
  'game.tile': 'Kachel',
  'win.moves': '{moves} Züge · Durchschnitt: {goal}',
  'win.best': 'Bestleistung: {n} Züge',
  'win.next': 'Weiter',
  'win.again': 'Nochmal',
  'win.list': 'Übersicht',
  'win.home': 'Startseite',
  'win.packDone': 'Paket geschafft!',
  'win.unlocked': 'Neues Paket freigeschaltet: {pack}',
  'win.hintEarned': '+1 Tipp verdient',
  'win.streak': '{n} Tage in Serie',
  'win.zenNext': 'Nächstes Level',
  'zen.title': 'Zen-Modus',
  'zen.pick': 'Wähle deine Schwierigkeit',
  'zen.d0': 'Sanft',
  'zen.d1': 'Ausgewogen',
  'zen.d2': 'Fordernd',
  'zen.d3': 'Meisterhaft',
  'settings.title': 'Einstellungen',
  'settings.sound': 'Ton & Vibration',
  'settings.theme': 'Design',
  'settings.theme.system': 'System',
  'settings.theme.light': 'Hell',
  'settings.theme.dark': 'Dunkel',
  'settings.lang': 'Sprache',
  'settings.lang.auto': 'Automatisch',
  'settings.assist': 'Assist-Modus',
  'settings.assistSub': 'Markiert Kacheln, die richtig liegen (erleichtert das Spiel)',
  'settings.reset': 'Fortschritt löschen',
  'settings.resetConfirm': 'Wirklich? Alle Sterne, Serien und Tipps gehen verloren.',
  'settings.about': 'Ein Farbverlauf-Puzzle · Open Source · Mit ♥ gebaut'
} as const;

export type MsgKey = keyof typeof de;

const en: Record<MsgKey, string> = {
  'app.title': 'ChromaFlow',
  'app.tagline': 'Bring the colors back into balance.',
  'home.continue': 'Continue',
  'home.daily': 'Daily puzzle',
  'home.dailyDone': 'Solved today',
  'home.streak': '{n}-day streak',
  'home.zen': 'Zen mode',
  'home.zenSub': 'Endless levels at your own pace',
  'home.packs': 'Level packs',
  'home.statsLevels': '{n} levels solved',
  'home.statsStars': '{n} stars',
  'home.settings': 'Settings',
  'pack.lockedHint': 'Solve {n} levels in “{pack}”',
  'pack.locked': 'Locked',
  'common.back': 'Back',
  'common.close': 'Close',
  'common.level': 'Level {n}',
  'game.moves': 'Moves',
  'game.restart': 'Restart',
  'game.restartConfirm': 'Sure?',
  'game.hint': 'Show hint ({n} left)',
  'game.noHints': 'No hints left — solving levels earns more.',
  'game.peek': 'Peek at the solution (hold)',
  'game.anchorLocked': 'This tile is fixed',
  'game.tile': 'Tile',
  'win.moves': '{moves} moves · average: {goal}',
  'win.best': 'Best: {n} moves',
  'win.next': 'Next',
  'win.again': 'Again',
  'win.list': 'Levels',
  'win.home': 'Home',
  'win.packDone': 'Pack complete!',
  'win.unlocked': 'New pack unlocked: {pack}',
  'win.hintEarned': '+1 hint earned',
  'win.streak': '{n}-day streak',
  'win.zenNext': 'Next level',
  'zen.title': 'Zen mode',
  'zen.pick': 'Pick your difficulty',
  'zen.d0': 'Gentle',
  'zen.d1': 'Balanced',
  'zen.d2': 'Demanding',
  'zen.d3': 'Masterful',
  'settings.title': 'Settings',
  'settings.sound': 'Sound & vibration',
  'settings.theme': 'Theme',
  'settings.theme.system': 'System',
  'settings.theme.light': 'Light',
  'settings.theme.dark': 'Dark',
  'settings.lang': 'Language',
  'settings.lang.auto': 'Automatic',
  'settings.assist': 'Assist mode',
  'settings.assistSub': 'Marks tiles that are placed correctly (makes the game easier)',
  'settings.reset': 'Delete progress',
  'settings.resetConfirm': 'Really? All stars, streaks and hints will be lost.',
  'settings.about': 'A color-gradient puzzle · open source · built with ♥'
};

/** Original one-liners shown on the win screen. */
export const WIN_LINES: Record<Lang, string[]> = {
  de: [
    'Alles findet seinen Platz.',
    'Farben atmen auf.',
    'Stille im Spektrum.',
    'Ordnung aus Licht.',
    'Der Verlauf fließt wieder.',
    'Sanft wie ein Morgen.',
    'Jede Nuance zu Hause.',
    'Harmonie, hergestellt.',
    'Ein Meer aus Übergängen.',
    'Das Auge ruht.',
    'Wie von selbst.',
    'Wieder im Fluss.',
    'Balance gefunden.',
    'Leise Perfektion.',
    'Feine Stufen, großes Ganzes.',
    'Licht sortiert sich.'
  ],
  en: [
    'Everything finds its place.',
    'The colors breathe again.',
    'Silence across the spectrum.',
    'Order made of light.',
    'The gradient flows once more.',
    'Soft as a morning.',
    'Every shade back home.',
    'Harmony, restored.',
    'A sea of transitions.',
    'The eye can rest.',
    'As if by itself.',
    'Back in flow.',
    'Balance found.',
    'Quiet perfection.',
    'Small steps, whole picture.',
    'Light sorting itself out.'
  ]
};

const dicts: Record<Lang, Record<MsgKey, string>> = { de, en };

let current: Lang = 'en';

export function resolveLang(setting: 'auto' | Lang, navLang = navigator.language): Lang {
  if (setting !== 'auto') return setting;
  return navLang.toLowerCase().startsWith('de') ? 'de' : 'en';
}

export function setLang(lang: Lang): void {
  current = lang;
  document.documentElement.lang = lang;
}

export function getLang(): Lang {
  return current;
}

export function t(key: MsgKey, vars?: Record<string, string | number>): string {
  let msg: string = dicts[current][key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) msg = msg.replaceAll(`{${k}}`, String(v));
  }
  return msg;
}

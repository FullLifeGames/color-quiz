# ChromaFlow — Implementierungsplan

Status-Legende: [ ] offen · [x] erledigt. Der Plan gilt als auto-approved und wird
Phase für Phase abgearbeitet; Haken werden beim Abschluss der Phase gesetzt.

## Phase 0 — Scaffold
- [x] `package.json` (Scripts: dev/build/preview/test/test:e2e/e2e:server/icons/typecheck)
- [x] `tsconfig.json` (strict), `vite.config.ts` (base './', PWA, Vitest-Config)
- [x] `playwright.config.ts` (Chromium Desktop, Pixel 7, iPhone 13/WebKit; webServer = build+preview)
- [x] `.gitignore`, `LICENSE` (MIT), `index.html` (Meta, Viewport, Theme-Color)
- [x] `.github/workflows/deploy.yml` (Test → Build → Pages)
- [x] `npm install`; Playwright-Browser installieren (Hintergrund)
- [x] Commit „scaffold“

## Phase 1 — Core-Logik (`src/core/`, DOM-frei)
- [x] `rng.ts` — mulberry32, hashString, int/pick/shuffle-Helfer
- [x] `permutation.ts` — Derangement (seeded, fixpunktfrei), minSwaps, isSolved, Zyklen
- [x] `color.ts` — Eckfarben aus Palette (Oklch, validiert), bilineares Grid (Oklab/Oklch),
      Oklab-Distanz, minPairDist, Punkt-Kontrastfarbe
- [x] `packs.ts` — 30 Paket-Definitionen (Name de/en, Palette), Schwierigkeitskurve
- [x] `level.ts` — Gridgrößen-/Ankermuster-Tabellen, Generator mit Validierungs-Loop
      (deterministisch, memoisiert, Best-of-N-Eckfarbensuche), par, Sterne-Schwellen
- [x] `store.ts` — SaveData v1, GameStore (injizierbarer Storage), Freischaltung,
      Tipp-Ökonomie, In-Progress, Stats, Migration
- [x] `hints.ts` — Tipp-Auswahl (2er-Zyklus > „falscheste“ Kachel)
- [x] `daily.ts` — Datums-Seed, Wochentags-Schwierigkeit, Streak-Logik

## Phase 2 — Unit-Tests (Vitest)
- [x] Tests je Core-Modul (siehe SPEC §8), inkl. Vollsweep über 720 Level
- [x] `npm run test` grün · Commit „core“

## Phase 3 — UI (`src/ui/`)
- [x] `i18n.ts` (de/en), `icons.ts` (Inline-SVGs), `sound.ts` (WebAudio-Blips)
- [x] `board.ts` — Rendering (absolute Kacheln + Transforms), Tap-Tap, Drag,
      Intro-Shuffle-Animation, Peek-Overlay, Hint-Highlight, Win-Welle, Resize
- [x] Screens: Home (Packs/Daily/Zen/Stats), Levelauswahl, Spiel (+ Win-Overlay),
      Einstellungs-Modal, Toasts
- [x] `app.ts` Hash-Router + Screen-Lifecycle, `main.ts` Bootstrap, `style.css`
      (Design-Tokens, hell/dunkel, responsive)
- [x] Build läuft · Commit „ui“

## Phase 4 — Visuelle Prüfung
- [x] `scripts/shots.mjs` — Screenshots Home/Pack/Spiel, Desktop + Mobile, hell + dunkel
- [x] Screenshots begutachtet: Home, Levelauswahl, Board hell/dunkel, leicht/schwer ok

## Phase 5 — E2E (Playwright)
- [x] Specs: smoke, solve (komplett lösen + Persistenz + Belohnung), hints (Tipp + Peek),
      persistence (Reload), unlock (präparierter Storage), daily, settings, mobile
- [x] `npm run test:e2e` grün: 62/62 (Chromium Desktop + Pixel 7 + WebKit) · Commit „e2e“
- [x] Dabei gefixt: Endlos-Animationen im Testmodus; ResizeObserver-Race im Intro

## Phase 6 — PWA & Feinschliff
- [x] `scripts/gen-icons.mjs` (pngjs) → Icons committet; Manifest/SW im Build verifiziert
- [x] README (de), PLAN-Haken aktualisiert
- [x] `/verify`-Durchlauf (Real-Modus-Drive: Drag, Anker, Peek, Hint, Win,
      Reload-Persistenz, Resize-Race, Dark Theme, Daily — alles PASS) · Commit „polish“

## Phase 7 — Deployment
- [ ] Branch → `main`, `gh repo create color-quiz --public --source . --push`
- [ ] Pages-Source „GitHub Actions“ per API aktivieren, Workflow-Lauf abwarten
- [ ] Live-URL abrufen und verifizieren; Repo-Metadaten (Description, Homepage)
- [ ] Abschlussbericht

## Risiken & Gegenmaßnahmen
- **Farb-Kollisionen auf großen Brettern** → Best-of-N-Suche + Paletten-Tuning;
  Vollsweep-Test über alle Level (Floor 0.012 Oklab, Einsteiger 0.018).
- **Flakige E2E durch Animationen** → Test-Modus (webdriver): verkürzte Animationen,
  keine Endlos-Animationen, kein SW/Konfetti; Warten auf `data-state="ready"`.
- **Pages-Pfad** → `base: './'` + Hash-Routing; PWA-Scope relativ.
- **Performance auf Mobilgeräten** → nur Transform/Opacity-Animationen, Level-Memoisierung,
  Paket-Karten aus Palette (ohne Level-Generierung) einfärben.

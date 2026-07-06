# ChromaFlow — Implementierungsplan

Status-Legende: [ ] offen · [x] erledigt. Der Plan gilt als auto-approved und wird
Phase für Phase abgearbeitet; Haken werden beim Abschluss der Phase gesetzt.

## Phase 0 — Scaffold
- [ ] `package.json` (Scripts: dev/build/preview/test/test:e2e/e2e:server/icons/typecheck)
- [ ] `tsconfig.json` (strict), `vite.config.ts` (base './', PWA, Vitest-Config)
- [ ] `playwright.config.ts` (Chromium Desktop, Pixel 7, iPhone 13/WebKit; webServer = build+preview)
- [ ] `.gitignore`, `LICENSE` (MIT), `index.html` (Meta, Viewport, Theme-Color)
- [ ] `.github/workflows/deploy.yml` (Test → Build → Pages)
- [ ] `npm install`; Playwright-Browser installieren (Hintergrund)
- [ ] Commit „scaffold"

## Phase 1 — Core-Logik (`src/core/`, DOM-frei)
- [ ] `rng.ts` — mulberry32, hashString, int/pick/shuffle-Helfer
- [ ] `permutation.ts` — Derangement (seeded, fixpunktfrei), minSwaps, isSolved, Zyklen
- [ ] `color.ts` — Eckfarben aus Palette (Oklch, validiert), bilineares Grid (Oklab/Oklch),
      Oklab-Distanz, minPairDist, Punkt-Kontrastfarbe
- [ ] `packs.ts` — 30 Paket-Definitionen (Name de/en, Palette), Schwierigkeitskurve
- [ ] `level.ts` — Gridgrößen-/Ankermuster-Tabellen, Generator mit Validierungs-Loop
      (deterministisch, memoisiert), par, Sterne-Schwellen
- [ ] `store.ts` — SaveData v1, GameStore (injizierbarer Storage), Freischaltung,
      Tipp-Ökonomie, In-Progress, Stats, Migration
- [ ] `hints.ts` — Tipp-Auswahl (2er-Zyklus > „falscheste" Kachel)
- [ ] `daily.ts` — Datums-Seed, Wochentags-Schwierigkeit, Streak-Logik

## Phase 2 — Unit-Tests (Vitest)
- [ ] Tests je Core-Modul (siehe SPEC §8), inkl. Vollsweep über 720 Level
- [ ] `npm run test` grün · Commit „core"

## Phase 3 — UI (`src/ui/`)
- [ ] `i18n.ts` (de/en), `icons.ts` (Inline-SVGs), `sound.ts` (WebAudio-Blips)
- [ ] `board.ts` — Rendering (absolute Kacheln + Transforms), Tap-Tap, Drag,
      Intro-Shuffle-Animation, Peek-Overlay, Hint-Highlight, Win-Welle, Resize
- [ ] Screens: Home (Packs/Daily/Zen/Stats), Levelauswahl, Spiel (+ Win-Overlay),
      Einstellungs-Modal, Toasts
- [ ] `app.ts` Hash-Router + Screen-Lifecycle, `main.ts` Bootstrap, `style.css`
      (Design-Tokens, hell/dunkel, responsive)
- [ ] Build läuft · Commit „ui"

## Phase 4 — Visuelle Prüfung
- [ ] `scripts/shots.mjs` — Screenshots Home/Pack/Spiel, Desktop + Mobile, hell + dunkel
- [ ] Screenshots begutachten, Design-Probleme fixen (iterieren)

## Phase 5 — E2E (Playwright)
- [ ] Specs: smoke, solve (komplett lösen + Persistenz + Belohnung), hints (Tipp + Peek),
      persistence (Reload), unlock (präparierter Storage), daily, settings, mobile
- [ ] `npm run test:e2e` grün (Chromium Desktop + Pixel 7 + WebKit-Smoke) · Commit „e2e"

## Phase 6 — PWA & Feinschliff
- [ ] `scripts/gen-icons.mjs` (pngjs) → Icons committen; Manifest/SW verifizieren
- [ ] README (de), PLAN-Haken aktualisieren, `/verify`-Durchlauf
- [ ] Commit „polish"

## Phase 7 — Deployment
- [ ] Branch → `main`, `gh repo create color-quiz --public --source . --push`
- [ ] Pages-Source „GitHub Actions" per API aktivieren, Workflow-Lauf abwarten
- [ ] Live-URL abrufen und verifizieren; Repo-Metadaten (Description, Homepage)
- [ ] Abschlussbericht

## Risiken & Gegenmaßnahmen
- **Farb-Kollisionen auf großen Brettern** → Validierungs-Loop mit deterministischem
  Re-Roll + progressiver Entspannung; Vollsweep-Test über alle Level.
- **Flakige E2E durch Animationen** → Test-Modus (webdriver): verkürzte Animationen,
  kein SW/Konfetti; Warten auf `data-state="ready"`.
- **Pages-Pfad** → `base: './'` + Hash-Routing; PWA-Scope relativ.
- **Performance auf Mobilgeräten** → nur Transform/Opacity-Animationen, Level-Memoisierung,
  Paket-Karten aus Palette (ohne Level-Generierung) einfärben.

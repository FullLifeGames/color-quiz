# ChromaFlow — Spezifikation

Eine Web-Nachbildung der Spielmechanik von Farbverlauf-Sortier-Puzzles (bekannt aus „I Love Hue"),
als eigenständiges Spiel mit eigenem Namen, eigenen Assets und eigenem Code.
**Keine** Übernahme von Grafiken, Texten oder Marken des Originals.

## 1. Spielprinzip

- Ein Brett aus `cols × rows` farbigen Kacheln bildet einen glatten, zweidimensionalen
  Farbverlauf (bilineare Interpolation zwischen 4 Eckfarben im Oklab-Farbraum).
- Zu Levelbeginn wird das gelöste Brett kurz gezeigt, dann werden alle **beweglichen**
  Kacheln animiert vermischt (deterministische, fixpunktfreie Permutation).
- **Anker-Kacheln** (mit Punkt markiert) sind fixiert und geben Orientierung.
- Der Spieler tauscht zwei bewegliche Kacheln durch **Antippen** (auswählen → tauschen)
  oder **Ziehen** (Drag & Drop). Jeder Tausch zählt als 1 Zug.
- Gewonnen, wenn jede Kachel an ihrer Originalposition liegt. Dann: Wellen-Animation,
  Konfetti, Ergebnis-Overlay mit Sternen.

### Wertung
- `par` = minimale Zuganzahl, um die Start-Permutation zu sortieren
  (Summe über Zyklen: `len − 1`). Rein intern (Sterne-Berechnung), nie angezeigt.
- `goal` = geschätzte Züge eines Durchschnittsspielers:
  `ceil(par × (1.35 + 0.5 × difficulty))`. Wird erst **nach** dem Lösen im
  Gewinn-Overlay gezeigt („x Züge · Durchschnitt: goal“) — während des Spiels
  (insbesondere im Zen-Modus) läuft nur der Zug-Zähler.
- Sterne: **3★** bei `moves ≤ ceil(par × 1.25)`, **2★** bei `moves ≤ ceil(par × 2.2)`,
  sonst **1★**. Beste Wertung pro Level wird gespeichert.

## 2. Inhalt & Progression

- **30 Level-Pakete × 24 Level = 720 Level**, deterministisch prozedural generiert
  (Seed = Paket + Levelindex ⇒ jeder Spieler sieht dieselben Level).
- Jedes Paket hat einen poetischen Namen (de/en) und eine eigene Farbpalette
  (Oklch: Basis-Farbton, Farbton-Spanne, Chroma- und Helligkeitsbereich).
- **Paletten-Varianz pro Level**: Innerhalb eines Pakets driftet das Farbton-Fenster
  (±45°, Regenbogen-Pakete ±15°) und Helligkeit/Chroma verschieben sich pro Level
  (deterministische Low-Discrepancy-Sequenz ⇒ aufeinanderfolgende Level springen
  garantiert sichtbar, bleiben aber im Paket-Thema).
- **Schwierigkeit** steigt global über Pakete und innerhalb eines Pakets:
  größere Bretter (4×5 bis 9×13), weniger Anker, feinere Farbabstufungen.
- **Freischaltung**: Paket 1 ist offen; Paket *n+1* öffnet sich, sobald in Paket *n*
  mindestens **12 von 24** Leveln gelöst sind.
- **Tägliches Puzzle**: 1 Level pro Kalendertag (Seed = Datum), Schwierigkeit steigt
  über die Woche (Mo leicht → So schwer). Serien-Zähler (Streak) für aufeinanderfolgende Tage.
- **Zen-Modus**: endlose Zufallslevel in 4 wählbaren Schwierigkeiten — unbegrenzter Inhalt.

### Generator-Qualitätsgarantien (pro Level erzwungen)
- Alle Kachelfarben paarweise unterscheidbar: minimale Oklab-Distanz über alle Paare
  ≥ Schwellwert (leicht ≈ 0.05, schwer ≈ 0.022); sonst deterministischer Re-Roll.
- ≥ 2 Anker, ≥ 6 bewegliche Kacheln, keine bewegliche Kachel startet auf ihrem Zielfeld.
- Level-Generierung ist eine reine Funktion (memoisiert), immer erfolgreich (Schwellwert
  wird bei Bedarf schrittweise entspannt).

## 3. Tippsystem

- **Vorschau (Auge)**: Gedrückt halten zeigt das gelöste Brett als Overlay. Kostenlos, unbegrenzt.
- **Tipp (Glühbirne)**: kostet 1 Tipp-Token. Markiert eine falsch liegende Kachel und ihr
  Zielfeld (bevorzugt ein 2er-Zyklus = direkt tauschbares Paar mit größter Farbdistanz).
  Der Spieler führt den Tausch selbst aus. Markierung erlischt nach dem nächsten Zug bzw. Timeout.
- **Ökonomie**: Start mit 10 Tokens, +1 pro gelöstem Level (max. 99). Stand wird gespeichert.

## 4. Persistenz (LocalStorage)

Schlüssel `chromaflow.v1`, versioniertes JSON:

```jsonc
{
  "version": 1,
  "hints": 10,
  "settings": { "sound": true, "theme": "system", "lang": "auto", "assist": false },
  "packs": { "0": { "3": { "stars": 3, "bestMoves": 8 } } },   // Bestleistungen
  "inProgress": { "p0-l3": { "perm": [...], "moves": 4, "hintsUsed": 0 } }, // laufende Bretter
  "daily": { "lastDate": "2026-07-06", "streak": 4, "total": 12 },
  "stats": { "levelsCompleted": 0, "totalMoves": 0, "totalStars": 0, "zenCompleted": 0 },
  "lastPlayed": { "packIdx": 0, "levelIdx": 3 }
}
```

- Laufende Level überleben Reload/App-Neustart (Permutation + Züge werden je Zug gespeichert).
- Defensive Migration (`version`-Feld), Fallback auf In-Memory-Storage, wenn LocalStorage
  nicht verfügbar ist (z. B. private Tabs).

## 5. UI / Screens (Hash-Routing, GitHub-Pages-kompatibel)

- `#/` **Home**: Titel, „Weiterspielen", Karte „Tägliches Puzzle" (mit 🔥-Streak),
  Zen-Modus, Paket-Grid (Karten mit Palette-Verlauf, Fortschritt, Schloss bei gesperrt),
  Mini-Statistik, Einstellungen (Zahnrad).
- `#/pack/<i>` **Levelauswahl**: 24 Buttons, jeder in der Paletten-Variante seines
  Levels eingefärbt, Sterne/Häkchen, Fortschrittsanzeige, Hinweis auf Freischaltbedingung.
- `#/play/<p>/<l>`, `#/daily`, `#/zen/<diff>` **Spiel**: Kopfzeile (zurück, Titel, Zug-Zähler),
  Brett, Fußzeile (Vorschau-Auge, Tipp mit Token-Zähler, Neustart mit Zwei-Schritt-Bestätigung).
  Gewinn-Overlay: Sterne, Züge vs. Durchschnitt (`goal`), poetische Zeile (eigene Texte),
  Weiter/Nochmal/Zurück.
- **Einstellungen** (Modal): Ton & Haptik, Design (System/Hell/Dunkel), Sprache (Auto/DE/EN),
  Assist-Modus (Punkt auf korrekt liegenden Kacheln), Fortschritt zurücksetzen (mit Bestätigung).
- **i18n**: Deutsch (Standard bei deutschem Browser) und Englisch; automatische Erkennung.

## 6. Interaktion & Mobile

- Tap-Tap und Pointer-Drag (Pointer Events, `setPointerCapture`), FLIP-artige
  Transform-Animationen, angehobene Kachel mit Schatten beim Ziehen.
- Anker sind nicht wähl-/ziehbar (Wackel-Feedback beim Versuch).
- Responsive: Brett skaliert in Breite *und* Höhe (`100dvh`-Layout, ResizeObserver),
  max. 9 Spalten ⇒ Kacheln ≥ ~38 px auf 360-px-Geräten; Bedienelemente ≥ 40 px.
- `touch-action`-Kontrolle (kein Scroll/Zoom auf dem Brett), `viewport-fit=cover`,
  Safe-Area-Insets, kein horizontales Scrollen, `prefers-reduced-motion` respektiert.
- Tastatur: Kacheln sind fokussierbare Buttons (Enter = wählen/tauschen).
- Dezente WebAudio-Sounds (synthetisiert, keine Assets) + optionale Vibration; abschaltbar.
- **PWA**: installierbar, offline-fähig (vite-plugin-pwa, Auto-Update), eigene App-Icons
  (programmatisch generierter Verlauf).

## 7. Technik

| Bereich | Wahl | Begründung |
|---|---|---|
| Sprache/Build | TypeScript strict + Vite | gefordert; schnelles Tooling |
| Farben | chroma-js | Oklab/Oklch-Interpolation & Konvertierung geschenkt |
| Konfetti | canvas-confetti | fertiger, hübscher Gewinn-Effekt |
| PWA | vite-plugin-pwa | Manifest + Service Worker generiert |
| Unit-Tests | Vitest | Vite-nativ, schnell |
| E2E | Playwright | Desktop + Mobile-Emulation (Chromium, WebKit) |
| UI | Vanilla TS + CSS | Board ist imperativ animiert; ein Framework spart hier
  nichts ein, kostet aber Bundle & Komplexität. Screens sind simple Templates. |

- Deterministischer RNG: mulberry32 + String-Hash (5 Zeilen, keine Dependency nötig).
- `base: './'` in Vite ⇒ funktioniert unter beliebigem GitHub-Pages-Pfad.
- Service Worker wird unter `navigator.webdriver` (Tests) nicht registriert;
  Test-Modus verkürzt Animationen für stabile E2E.

## 8. Tests

**Vitest (Core, DOM-frei):** RNG-Determinismus; Derangement ohne Fixpunkte; `minSwaps`
gegen Brute-Force; Farbdistanz-Garantien; Generator-Determinismus & Vollsweep über
alle 720 Level; Sterne-Schwellen; Store (Roundtrip, Freischaltung, Tipp-Ökonomie,
Migration, In-Progress); Daily (Seed, Streak-Logik); Hint-Auswahl (2er-Zyklus bevorzugt).

**Playwright (E2E):** Smoke (Home, Navigation, gesperrte Pakete); Board-Rendering &
Anker; komplettes Lösen von Level 1 inkl. Gewinn-Overlay, Sternen, LocalStorage-Eintrag
und Token-Gutschrift; Persistenz über Reload (Züge + Brettzustand + Abschluss); Tipp
(Markierung + Token-Abzug) und Vorschau; Neustart; Freischaltung (mit präpariertem
LocalStorage); Daily inkl. Streak; Einstellungen; **Mobile-Viewport** (kein horizontales
Scrollen, Touch-Ziele ≥ 40 px, Lösen per Tap) auf Chromium (Pixel 7) und WebKit (iPhone 13).

## 9. Deployment

- GitHub-Repo `color-quiz` (public, Account FullLifeGames), Branch `main`.
- GitHub Actions: bei Push → Typecheck + Unit + E2E; danach Build → GitHub Pages
  (offizielle `actions/deploy-pages`-Pipeline, Pages-Source „GitHub Actions").
- Live-URL: `https://fulllifegames.github.io/color-quiz/` — wird nach Deploy verifiziert.

## 10. Nicht-Ziele (bewusst)

- Kein Backend/Cloud-Sync, keine Werbung/IAP, keine nicht-rechteckigen Bretter (v1),
  kein Undo (jeder Tausch ist manuell umkehrbar), keine Übernahme von Original-Assets.

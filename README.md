# ChromaFlow 🎨

**Bring die Farben ins Gleichgewicht.** Ein Farbverlauf-Puzzle als Web-App: Tausche
Kacheln, bis der Verlauf wieder glatt fließt. Inspiriert von Farbsortier-Spielen wie
„I Love Hue" — als komplett eigenständige, quelloffene Umsetzung mit eigenen Leveln,
eigenem Design und eigenem Code (keine Inhalte des Originals).

**▶ Spielen:** https://fulllifegames.github.io/color-quiz/

## Features

- 🧩 **720 Level** in 30 Paketen mit eigenen Farbwelten — deterministisch generiert,
  jeder Spieler sieht dieselben Level
- 📅 **Tägliches Puzzle** mit Streak-Zähler
- ♾️ **Zen-Modus**: endlose Level in vier Schwierigkeiten
- 💡 **Tippsystem**: Lösung ansehen (Auge halten) + Tipp-Tokens, die markieren,
  welche Kacheln getauscht gehören (+1 Token pro gelöstem Level)
- ⭐ Sterne-Wertung gegen die minimal mögliche Zuganzahl
- 💾 Fortschritt, Serien, laufende Bretter und Einstellungen im LocalStorage —
  ein angefangenes Level übersteht jeden Reload
- 📱 Mobile-first: Tap oder Drag, kein Zoom/Scroll-Gefrickel, installierbar als
  **PWA** (offline spielbar), helles + dunkles Design, Deutsch/Englisch

## Entwicklung

```bash
npm install
npm run dev        # Dev-Server
npm test           # Unit-Tests (Vitest, inkl. Sweep über alle 720 Level)
npm run test:e2e   # E2E (Playwright: Desktop, Pixel 7, iPhone 13/WebKit)
npm run build      # Typecheck + Produktions-Build (dist/)
npm run shots      # Design-Screenshots (Preview-Server muss laufen)
```

Technik: TypeScript (strict) + Vite, [chroma-js](https://github.com/gka/chroma.js)
für Oklab/Oklch-Farbinterpolation, canvas-confetti, vite-plugin-pwa, Vitest,
Playwright. Bewusst ohne UI-Framework — das Board ist imperativ animiert.

Details: [docs/SPEC.md](docs/SPEC.md) · [docs/PLAN.md](docs/PLAN.md)

## Deployment

Jeder Push auf `main` läuft durch GitHub Actions (Typecheck → Unit → E2E) und wird
anschließend auf GitHub Pages deployt (`.github/workflows/deploy.yml`).

## Lizenz

[MIT](LICENSE)

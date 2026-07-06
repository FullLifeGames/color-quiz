---
name: verify
description: Build, launch and drive ChromaFlow end-to-end to verify changes at the real GUI surface (not via test reruns).
---

# Verifying ChromaFlow

Surface: browser GUI (Vite SPA, hash routing). Drive it with Playwright's
library API against the production preview build.

## Build & launch

```powershell
npm run build                 # tsc + vite build → dist/
npm run preview               # serves dist/ at http://localhost:4173 (strict port)
```

## Drive

Use a standalone Playwright script (see `verify-drive.local.mjs` pattern, gitignored):

- **Real-user mode:** override `navigator.webdriver` to `false` via
  `context.addInitScript` — otherwise the app enters test mode (instant
  animations, no confetti, no service worker registration).
- In real-user mode, selected/hinted tiles pulse forever by design; Playwright
  actionability checks consider them "not stable" — use `{ force: true }` on
  tile taps/clicks.
- Board state is readable from the DOM: every `.tile` carries `data-tile`
  (home cell), `data-cell` (current cell), `data-anchor`. Solved ⇔
  `data-tile === data-cell` for all. Wait for `.board[data-state="ready"]`.
- To solve: repeatedly tap a misplaced tile, then the tile occupying its
  home cell (this is optimal, earns 3 stars).
- Save data: `localStorage['chromaflow.v1']` (JSON).

## Flows worth driving

home → pack → level (intro reveal → shuffle), drag-swap with the mouse
(≥ 8 px threshold before a press becomes a drag), drag onto an anchor
(springs back), tap-tap swap, peek hold (eye button, `.peek[data-peek]`),
hint (`.tile.hint-from` / `.tile.hint-to`, token badge), win overlay
(stars/confetti), reload mid-level (moves + layout persist), settings
(theme attr on `<html>`), daily/zen boards, resize during intro
(must NOT snap tiles back to solved — regression from a fixed race).

## Gotchas

- `npm run preview` fails if 4173 is taken (strict port) — kill stale servers.
- Unit sweep (`npm test`) regenerates all 720 levels (~20 s); not needed for
  GUI verification.
- PowerShell 5.1 `Get-Content`/`Set-Content` without `-Encoding utf8`
  mangles the German umlauts in docs.

/**
 * Interactive board: absolutely positioned tile buttons moved via transforms,
 * tap-tap and drag-to-swap, intro shuffle animation, peek overlay, hint
 * highlights, assist markers and the win wave. Renders any board geometry
 * (squares, hexagons, triangles, masked layouts) via per-cell clip-paths:
 * the mosaic is fixed, tiles adopt the shape of the cell they sit on.
 */
import type { Level } from '../core/level';
import { applySwap, isSolved } from '../core/permutation';
import { prefersDarkMarker } from '../core/color';
import type { Hint } from '../core/hints';
import { t } from './i18n';

export interface BoardCallbacks {
  /** After every player swap (also fired for restored boards' further moves). */
  onMove(perm: readonly number[], moves: number): void;
  onWin(moves: number): void;
  sfx: { select(): void; swap(): void; denied(): void };
}

export interface BoardOptions {
  restorePerm?: readonly number[];
  restoreMoves?: number;
  assist: boolean;
  /** Shorter timings + no intro reveal (used for restored boards and tests). */
  skipIntro: boolean;
  testMode: boolean;
}

const DRAG_THRESHOLD = 8;
/** Extra px per side on clipped tiles so adjacent shapes overlap hairline seams. */
const SEAM = 0.75;

export class BoardView {
  readonly el: HTMLElement;
  private peekEl: HTMLElement;
  private tiles: HTMLButtonElement[] = [];
  private peekCells: HTMLElement[] = [];
  /** perm[cell] = tileId */
  private perm: number[];
  /** cellOf[tileId] = cell */
  private cellOf: number[] = [];
  private moves: number;
  private unit = 40;
  private state: 'intro' | 'ready' | 'won' = 'intro';
  /** True only while the intro shows the solved layout; layout() must not
   *  snap tiles back to solved positions once the shuffle has started. */
  private revealPhase = true;
  private resizeObserver: ResizeObserver;
  private hintTimer: number | null = null;
  private disposed = false;

  // drag state
  private pointerId: number | null = null;
  private dragTile: number | null = null;
  private dragging = false;
  private startX = 0;
  private startY = 0;
  private selected: number | null = null; // tileId

  constructor(
    private container: HTMLElement,
    private level: Level,
    private opts: BoardOptions,
    private cb: BoardCallbacks
  ) {
    this.perm = opts.restorePerm ? [...opts.restorePerm] : [...level.initialPerm];
    this.moves = opts.restoreMoves ?? 0;

    this.el = document.createElement('div');
    this.el.className = 'board';
    this.el.dataset.state = 'intro';
    this.el.dataset.shape = level.shape;

    this.peekEl = document.createElement('div');
    this.peekEl.className = 'peek';
    this.peekEl.dataset.peek = '0';
    this.peekEl.setAttribute('aria-hidden', 'true');

    this.buildTiles();
    this.el.appendChild(this.peekEl);
    container.appendChild(this.el);

    this.layout();
    this.resizeObserver = new ResizeObserver(() => this.layout());
    this.resizeObserver.observe(container);

    this.runIntro();
  }

  get currentMoves(): number {
    return this.moves;
  }

  get currentPerm(): readonly number[] {
    return this.perm;
  }

  get isReady(): boolean {
    return this.state === 'ready';
  }

  destroy(): void {
    this.disposed = true;
    this.resizeObserver.disconnect();
    if (this.hintTimer) window.clearTimeout(this.hintTimer);
    this.el.remove();
  }

  // --- construction --------------------------------------------------------

  private buildTiles(): void {
    const { level } = this;
    const size = level.geom.cells.length;
    this.cellOf = new Array(size);
    for (let cell = 0; cell < size; cell++) this.cellOf[this.perm[cell]] = cell;

    for (let tile = 0; tile < size; tile++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tile';
      btn.style.background = level.colors[tile];
      btn.dataset.tile = String(tile);
      btn.dataset.anchor = level.anchors[tile] ? '1' : '0';
      if (level.anchors[tile]) {
        btn.classList.add('anchor', prefersDarkMarker(level.colors[tile]) ? 'dot-dark' : 'dot-light');
        btn.tabIndex = -1;
      }
      btn.setAttribute('aria-label', `${t('game.tile')} ${tile + 1}`);
      btn.addEventListener('pointerdown', (e) => this.onPointerDown(e, tile));
      btn.addEventListener('pointermove', (e) => this.onPointerMove(e, tile));
      btn.addEventListener('pointerup', (e) => this.onPointerUp(e, tile));
      btn.addEventListener('pointercancel', () => this.cancelPointer(tile));
      btn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.onTap(tile);
        }
      });
      this.tiles.push(btn);
      this.el.appendChild(btn);
    }

    // Peek overlay: solved colors on the same cell layout.
    for (let cell = 0; cell < size; cell++) {
      const d = document.createElement('div');
      d.style.background = level.colors[cell];
      this.peekCells.push(d);
      this.peekEl.appendChild(d);
    }
  }

  // --- layout --------------------------------------------------------------

  private layout(): void {
    if (this.disposed) return;
    const { geom } = this.level;
    const rect = this.container.getBoundingClientRect();
    const availW = rect.width;
    const availH = rect.height;
    if (availW < 10 || availH < 10) return;
    this.unit = Math.max(24, Math.min(72, Math.floor(Math.min(availW / geom.width, availH / geom.height))));
    this.el.style.width = `${geom.width * this.unit}px`;
    this.el.style.height = `${geom.height * this.unit}px`;

    this.el.classList.add('no-anim');
    for (let tileId = 0; tileId < this.tiles.length; tileId++) {
      this.positionTile(tileId, this.revealPhase ? tileId : this.cellOf[tileId]);
    }
    for (let cell = 0; cell < this.peekCells.length; cell++) {
      this.placeOnCell(this.peekCells[cell], cell);
    }
    // Force reflow so re-enabling transitions doesn't animate the layout pass.
    void this.el.offsetWidth;
    this.el.classList.remove('no-anim');
  }

  /** Size, position, clip and marker vars for any element occupying a cell. */
  private placeOnCell(el: HTMLElement, cell: number): void {
    const c = this.level.geom.cells[cell];
    const seam = c.clip ? SEAM : 0;
    el.style.width = `${c.w * this.unit + 2 * seam}px`;
    el.style.height = `${c.h * this.unit + 2 * seam}px`;
    el.style.transform = `translate3d(${c.x * this.unit - seam}px, ${c.y * this.unit - seam}px, 0)`;
    el.style.clipPath = c.clip ?? '';
    el.style.setProperty('--dot-x', `${c.dotX}%`);
    el.style.setProperty('--dot-y', `${c.dotY}%`);
  }

  private positionTile(tileId: number, cell: number): void {
    this.placeOnCell(this.tiles[tileId], cell);
    this.tiles[tileId].dataset.cell = String(cell);
  }

  // --- intro ---------------------------------------------------------------

  private runIntro(): void {
    if (this.opts.skipIntro) {
      this.revealPhase = false;
      for (let tile = 0; tile < this.tiles.length; tile++) this.positionTile(tile, this.cellOf[tile]);
      this.setState('ready');
      this.updateAssist();
      return;
    }
    // Show solved layout briefly, then animate to the shuffled permutation.
    const reveal = this.opts.testMode ? 20 : 900;
    const shuffleDur = this.opts.testMode ? 20 : 700;
    window.setTimeout(() => {
      if (this.disposed) return;
      this.revealPhase = false;
      this.el.classList.add('shuffling');
      for (let tile = 0; tile < this.tiles.length; tile++) this.positionTile(tile, this.cellOf[tile]);
      window.setTimeout(() => {
        if (this.disposed) return;
        this.el.classList.remove('shuffling');
        this.setState('ready');
        this.updateAssist();
      }, shuffleDur + 60);
    }, reveal);
  }

  private setState(state: 'intro' | 'ready' | 'won'): void {
    this.state = state;
    this.el.dataset.state = state;
  }

  // --- interaction ---------------------------------------------------------

  private onPointerDown(e: PointerEvent, tileId: number): void {
    if (this.state !== 'ready') return;
    if (this.level.anchors[tileId]) {
      this.wiggle(tileId);
      this.cb.sfx.denied();
      return;
    }
    if (this.pointerId !== null) return;
    this.pointerId = e.pointerId;
    this.dragTile = tileId;
    this.dragging = false;
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.tiles[tileId].setPointerCapture(e.pointerId);
  }

  private onPointerMove(e: PointerEvent, tileId: number): void {
    if (this.pointerId !== e.pointerId || this.dragTile !== tileId || this.state !== 'ready') return;
    const dx = e.clientX - this.startX;
    const dy = e.clientY - this.startY;
    if (!this.dragging && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    if (!this.dragging) {
      this.dragging = true;
      this.tiles[tileId].classList.add('dragging');
      this.clearSelection();
    }
    const c = this.level.geom.cells[this.cellOf[tileId]];
    const seam = c.clip ? SEAM : 0;
    const x = c.x * this.unit - seam + dx;
    const y = c.y * this.unit - seam + dy;
    this.tiles[tileId].style.transform = `translate3d(${x}px, ${y}px, 0) scale(1.06)`;
  }

  private onPointerUp(e: PointerEvent, tileId: number): void {
    if (this.pointerId !== e.pointerId || this.dragTile !== tileId) return;
    const wasDragging = this.dragging;
    this.pointerId = null;
    this.dragTile = null;
    this.dragging = false;

    if (this.state !== 'ready') return;
    if (!wasDragging) {
      this.onTap(tileId);
      return;
    }
    this.tiles[tileId].classList.remove('dragging');
    const rect = this.el.getBoundingClientRect();
    const target = this.cellAt(e.clientX - rect.left, e.clientY - rect.top);
    const origin = this.cellOf[tileId];
    const validTarget = target !== null && target !== origin && !this.level.anchors[this.perm[target]];
    if (validTarget) {
      this.doSwap(origin, target);
    } else {
      this.positionTile(tileId, origin);
      if (target !== origin) this.cb.sfx.denied();
    }
  }

  /** Nearest cell center to a board-local point, or null when too far away. */
  private cellAt(px: number, py: number): number | null {
    const { cells } = this.level.geom;
    let best = -1;
    let bestD = Infinity;
    for (let i = 0; i < cells.length; i++) {
      const d = Math.hypot(cells[i].cx * this.unit - px, cells[i].cy * this.unit - py);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    if (best < 0) return null;
    const c = cells[best];
    return bestD <= 0.75 * this.unit * Math.max(c.w, c.h) ? best : null;
  }

  private cancelPointer(tileId: number): void {
    if (this.dragTile !== tileId) return;
    this.pointerId = null;
    this.dragTile = null;
    this.dragging = false;
    this.tiles[tileId].classList.remove('dragging');
    this.positionTile(tileId, this.cellOf[tileId]);
  }

  private onTap(tileId: number): void {
    if (this.state !== 'ready') return;
    if (this.level.anchors[tileId]) {
      this.wiggle(tileId);
      this.cb.sfx.denied();
      return;
    }
    if (this.selected === null) {
      this.selected = tileId;
      this.tiles[tileId].classList.add('selected');
      this.cb.sfx.select();
    } else if (this.selected === tileId) {
      this.clearSelection();
    } else {
      const a = this.cellOf[this.selected];
      const b = this.cellOf[tileId];
      this.clearSelection();
      this.doSwap(a, b);
    }
  }

  private clearSelection(): void {
    if (this.selected !== null) {
      this.tiles[this.selected].classList.remove('selected');
      this.selected = null;
    }
  }

  private wiggle(tileId: number): void {
    const btn = this.tiles[tileId];
    btn.classList.remove('wiggle');
    void btn.offsetWidth;
    btn.classList.add('wiggle');
  }

  /** Swap the tiles on cells a and b (player action). */
  private doSwap(a: number, b: number): void {
    this.clearHint();
    applySwap(this.perm, a, b);
    const tileA = this.perm[a];
    const tileB = this.perm[b];
    this.cellOf[tileA] = a;
    this.cellOf[tileB] = b;
    this.positionTile(tileA, a);
    this.positionTile(tileB, b);
    this.moves += 1;
    this.cb.sfx.swap();
    this.updateAssist();
    this.cb.onMove(this.perm, this.moves);
    if (isSolved(this.perm)) this.finish();
  }

  private finish(): void {
    this.setState('won');
    this.clearSelection();
    const { geom } = this.level;
    const cx = geom.width / 2;
    const cy = geom.height / 2;
    const delayScale = this.opts.testMode ? 0 : 26;
    for (let cell = 0; cell < this.tiles.length; cell++) {
      const btn = this.tiles[this.perm[cell]];
      const c = geom.cells[cell];
      const dist = Math.hypot(c.cx - cx, c.cy - cy);
      btn.style.animationDelay = `${Math.round(dist * delayScale)}ms`;
      btn.classList.add('pop');
    }
    window.setTimeout(() => this.cb.onWin(this.moves), this.opts.testMode ? 40 : 950);
  }

  // --- external controls ---------------------------------------------------

  setPeek(on: boolean): void {
    this.peekEl.dataset.peek = on ? '1' : '0';
  }

  showHint(hint: Hint): void {
    this.clearHint();
    const wrongTile = this.perm[hint.fromCell];
    const occupant = this.perm[hint.toCell];
    this.tiles[wrongTile].classList.add('hint-from');
    this.tiles[occupant].classList.add('hint-to');
    this.hintTimer = window.setTimeout(() => this.clearHint(), 6000);
  }

  clearHint(): void {
    if (this.hintTimer) {
      window.clearTimeout(this.hintTimer);
      this.hintTimer = null;
    }
    for (const btn of this.tiles) btn.classList.remove('hint-from', 'hint-to');
  }

  setAssist(on: boolean): void {
    this.opts.assist = on;
    this.updateAssist();
  }

  private updateAssist(): void {
    if (!this.opts.assist) {
      for (const btn of this.tiles) btn.classList.remove('correct');
      return;
    }
    for (let cell = 0; cell < this.perm.length; cell++) {
      const tile = this.perm[cell];
      if (this.level.anchors[tile]) continue;
      this.tiles[tile].classList.toggle('correct', tile === cell);
    }
  }

  restart(): void {
    this.clearHint();
    this.clearSelection();
    this.perm = [...this.level.initialPerm];
    for (let cell = 0; cell < this.perm.length; cell++) this.cellOf[this.perm[cell]] = cell;
    for (let tile = 0; tile < this.tiles.length; tile++) {
      this.tiles[tile].classList.remove('pop');
      this.tiles[tile].style.animationDelay = '';
      this.positionTile(tile, this.cellOf[tile]);
    }
    this.moves = 0;
    this.setState('ready');
    this.updateAssist();
    this.cb.onMove(this.perm, 0);
  }
}

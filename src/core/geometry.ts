/**
 * Board geometries: cell layouts for the different board types. Each cell has
 * a bounding box in abstract units, a center (used for color sampling, drag
 * targeting and the win wave), a CSS clip-path polygon for its visual shape,
 * and border/corner flags that the anchor patterns build on.
 */

export type ShapeId = 'square' | 'hex' | 'tri' | 'diamond';

export const SHAPES: readonly ShapeId[] = ['square', 'hex', 'tri', 'diamond'];

export interface CellGeom {
  /** Bounding box (top-left + size) in abstract units. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Visual center: color sample point, drag target, wave origin. */
  cx: number;
  cy: number;
  /** CSS clip-path polygon, or null for a plain rectangle. */
  clip: string | null;
  border: boolean;
  corner: boolean;
  /** Marker anchor (anchor dot / hint ring) within the bbox, in %. */
  dotX: number;
  dotY: number;
}

export interface BoardGeom {
  shape: ShapeId;
  /** Abstract bounding box; the UI scales it to fit the container. */
  width: number;
  height: number;
  cells: CellGeom[];
}

const HEX_H = 2 / Math.sqrt(3); // pointy-top hexagon height for width 1
const HEX_STEP = HEX_H * 0.75; // vertical distance between hex rows
const TRI_H = Math.sqrt(3) / 2; // equilateral triangle height for base 1

const HEX_CLIP = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';
const TRI_UP = 'polygon(50% 0%, 100% 100%, 0% 100%)';
const TRI_DOWN = 'polygon(0% 0%, 100% 0%, 50% 100%)';

/**
 * Build the cell layout for a shape. `cols`/`rows` are the size class of an
 * equivalent square grid; every shape yields a similar total cell count so
 * the difficulty curve carries over unchanged.
 */
export function makeGeometry(shape: ShapeId, cols: number, rows: number): BoardGeom {
  switch (shape) {
    case 'hex':
      return hexGeometry(cols, rows);
    case 'tri':
      return triGeometry(cols, rows);
    case 'diamond':
      return diamondGeometry(cols, rows);
    default:
      return squareGeometry(cols, rows);
  }
}

function squareGeometry(cols: number, rows: number): BoardGeom {
  const cells: CellGeom[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const border = c === 0 || r === 0 || c === cols - 1 || r === rows - 1;
      const corner = (c === 0 || c === cols - 1) && (r === 0 || r === rows - 1);
      cells.push({
        x: c,
        y: r,
        w: 1,
        h: 1,
        cx: c + 0.5,
        cy: r + 0.5,
        clip: null,
        border,
        corner,
        dotX: 50,
        dotY: 50
      });
    }
  }
  return { shape: 'square', width: cols, height: rows, cells };
}

/** Pointy-top hexagons in offset rows; odd rows are one cell shorter. */
function hexGeometry(cols: number, rows: number): BoardGeom {
  const cells: CellGeom[] = [];
  for (let r = 0; r < rows; r++) {
    const count = cols - (r % 2);
    const xOff = (r % 2) * 0.5;
    for (let c = 0; c < count; c++) {
      const border = r === 0 || r === rows - 1 || c === 0 || c === count - 1;
      const corner = (r === 0 || r === rows - 1) && (c === 0 || c === count - 1);
      cells.push({
        x: xOff + c,
        y: r * HEX_STEP,
        w: 1,
        h: HEX_H,
        cx: xOff + c + 0.5,
        cy: r * HEX_STEP + HEX_H / 2,
        clip: HEX_CLIP,
        border,
        corner,
        dotX: 50,
        dotY: 50
      });
    }
  }
  return { shape: 'hex', width: cols, height: (rows - 1) * HEX_STEP + HEX_H, cells };
}

/**
 * Alternating up/down triangles; strips interlock, edges zigzag.
 * Narrow rows (≈ as many horizontal sample positions as the square grid has
 * columns) keep neighbouring colors as distinguishable as on square boards.
 */
function triGeometry(cols: number, rows: number): BoardGeom {
  const perRow = 2 * Math.ceil((cols + 1) / 2) - 1;
  const triRows = Math.max(3, Math.round((cols * rows) / perRow));
  const cells: CellGeom[] = [];
  for (let r = 0; r < triRows; r++) {
    for (let k = 0; k < perRow; k++) {
      const up = (r + k) % 2 === 0;
      const border = r === 0 || r === triRows - 1 || k === 0 || k === perRow - 1;
      const corner = (r === 0 || r === triRows - 1) && (k === 0 || k === perRow - 1);
      cells.push({
        x: k * 0.5,
        y: r * TRI_H,
        w: 1,
        h: TRI_H,
        cx: k * 0.5 + 0.5,
        // Centroid: 2/3 down for up-pointing, 1/3 down for down-pointing.
        cy: r * TRI_H + (up ? TRI_H * (2 / 3) : TRI_H / 3),
        clip: up ? TRI_UP : TRI_DOWN,
        border,
        corner,
        dotX: 50,
        dotY: up ? 63 : 37
      });
    }
  }
  return { shape: 'tri', width: (perRow + 1) / 2, height: triRows * TRI_H, cells };
}

/**
 * Square cells masked into a rhombus outline. Runs on a barely enlarged grid
 * (≈ 60% of the square cell count): a rhombus packs √2× more sample positions
 * per axis than a square of equal count, which would push neighbouring colors
 * below the distinguishability floor.
 */
function diamondGeometry(cols: number, rows: number): BoardGeom {
  const dCols = cols + 1;
  const dRows = rows + 1;
  const ccx = (dCols - 1) / 2;
  const ccy = (dRows - 1) / 2;
  const rx = ccx + 0.5;
  const ry = ccy + 0.5;
  const inside = (c: number, r: number): boolean =>
    Math.abs(c - ccx) / rx + Math.abs(r - ccy) / ry <= 1.0001;

  const cells: CellGeom[] = [];
  let minX = Infinity;
  let minY = Infinity;
  for (let r = 0; r < dRows; r++) {
    for (let c = 0; c < dCols; c++) {
      if (!inside(c, r)) continue;
      const border =
        !inside(c - 1, r) || !inside(c + 1, r) || !inside(c, r - 1) || !inside(c, r + 1);
      cells.push({
        x: c,
        y: r,
        w: 1,
        h: 1,
        cx: c + 0.5,
        cy: r + 0.5,
        clip: null,
        border,
        corner: false,
        dotX: 50,
        dotY: 50
      });
      minX = Math.min(minX, c);
      minY = Math.min(minY, r);
    }
  }
  // Normalize so the bbox starts at the origin.
  let maxX = 0;
  let maxY = 0;
  for (const cell of cells) {
    cell.x -= minX;
    cell.y -= minY;
    cell.cx -= minX;
    cell.cy -= minY;
    maxX = Math.max(maxX, cell.x + cell.w);
    maxY = Math.max(maxY, cell.y + cell.h);
  }
  // The four tips act as corners.
  for (const pick of [
    (a: CellGeom, b: CellGeom) => a.cx - b.cx || Math.abs(a.cy - maxY / 2) - Math.abs(b.cy - maxY / 2),
    (a: CellGeom, b: CellGeom) => b.cx - a.cx || Math.abs(a.cy - maxY / 2) - Math.abs(b.cy - maxY / 2),
    (a: CellGeom, b: CellGeom) => a.cy - b.cy || Math.abs(a.cx - maxX / 2) - Math.abs(b.cx - maxX / 2),
    (a: CellGeom, b: CellGeom) => b.cy - a.cy || Math.abs(a.cx - maxX / 2) - Math.abs(b.cx - maxX / 2)
  ]) {
    [...cells].sort(pick)[0].corner = true;
  }
  return { shape: 'diamond', width: maxX, height: maxY, cells };
}

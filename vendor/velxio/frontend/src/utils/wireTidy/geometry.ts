/**
 * Shared geometry for the wire-tidy engine.
 *
 * Everything here is pure: a `PartGeom` is what the DOM probe measured for one
 * board/component (body size + pinInfo), and the rest of the engine works on
 * those numbers alone, so it runs (and is tested) without a browser.
 *
 * Coordinate model, matching the canvas (see useSimulatorStore
 * recalculateAllWirePositions):
 *   - a board's element sits at (board.x, board.y);
 *   - a component's wrapper sits at (c.x, c.y) and its element at
 *     (c.x + 6, c.y + 6) — padding 4 + border 2.
 * pinInfo x/y are CSS px relative to the element's top-left.
 */

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Side = 'top' | 'bottom' | 'left' | 'right';

export interface PinGeom {
  name: string;
  /** Relative to the element's top-left. */
  x: number;
  y: number;
}

export interface PartGeom {
  id: string;
  kind: 'board' | 'component';
  /** Element offset from the part's (x, y): 0 for boards, 6 for components. */
  offset: number;
  w: number;
  h: number;
  /** Width of the name label under a component (0 for boards). */
  labelW?: number;
  pins: PinGeom[];
}

export interface CircuitPart {
  id: string;
  x: number;
  y: number;
  metadataId?: string;
  boardKind?: string;
  properties?: Record<string, unknown>;
}

export interface WireLike {
  id: string;
  start: { componentId: string; pinName: string; x: number; y: number };
  end: { componentId: string; pinName: string; x: number; y: number };
  waypoints: Point[];
  color: string;
  [k: string]: unknown;
}

export interface CircuitLike {
  boards: Array<CircuitPart & { boardKind: string }>;
  components: Array<CircuitPart & { metadataId: string }>;
  wires: WireLike[];
}

export type GeomMap = Map<string, PartGeom>;

/** Same fallbacks as pinPositionCalculator: exact name, then `NAME.1`. */
export function findPin(geom: PartGeom, pinName: string): PinGeom | undefined {
  const exact = geom.pins.find((p) => p.name === pinName);
  if (exact) return exact;
  if (!pinName.includes('.')) {
    const dotted = geom.pins.find((p) => p.name === `${pinName}.1`);
    if (dotted) return dotted;
  }
  if (pinName.startsWith('GP')) {
    const n = parseInt(pinName.substring(2), 10);
    const byDesc = geom.pins.find((p) => (p as PinGeom & { description?: string }).description === `GPIO${n}`);
    if (byDesc) return byDesc;
  }
  return undefined;
}

export function bodyRect(geom: PartGeom, pos: Point): Rect {
  return { x: pos.x + geom.offset, y: pos.y + geom.offset, w: geom.w, h: geom.h };
}

/** Component label strip under the element (DynamicComponent .component-label). */
export const LABEL_H = 18;

/**
 * The whole on-canvas footprint: for a component, its wrapper (padding+border
 * on every side) plus the name label underneath. Used for clearance and as the
 * routing obstacle; `bodyRect` (the drawn part) is what metrics judge.
 */
export function footRect(geom: PartGeom, pos: Point): Rect {
  if (geom.kind === 'board') return bodyRect(geom, pos);
  return { x: pos.x, y: pos.y, w: Math.max(geom.w, geom.labelW ?? 0) + 2 * geom.offset, h: geom.h + 2 * geom.offset + LABEL_H };
}

export function pinAbs(geom: PartGeom, pos: Point, pin: PinGeom): Point {
  return { x: pos.x + geom.offset + pin.x, y: pos.y + geom.offset + pin.y };
}

/** The body edge a pin sits nearest to — the direction its wire should leave in. */
export function pinSide(geom: PartGeom, pin: PinGeom): Side {
  const d: Array<[Side, number]> = [
    ['top', pin.y],
    ['bottom', geom.h - pin.y],
    ['left', pin.x],
    ['right', geom.w - pin.x],
  ];
  d.sort((a, b) => a[1] - b[1]);
  return d[0][0];
}

export const NORMAL: Record<Side, Point> = {
  top: { x: 0, y: -1 },
  bottom: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export const OPPOSITE: Record<Side, Side> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };

export function inflate(r: Rect, m: number): Rect {
  return { x: r.x - m, y: r.y - m, w: r.w + 2 * m, h: r.h + 2 * m };
}

/** Gap between two rects, as the layout guard measures it: negative = overlap. */
export function rectGap(a: Rect, b: Rect): number {
  const dx = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const dy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  if (dx > 0 && dy > 0) return -Math.min(dx, dy);
  return Math.max(-dx, -dy);
}

const POWER_RE = /^(gnd|vss|agnd|dgnd|vcc|vdd|vin|vbus|5v|3v3|3\.3v|3v|ioref|v\+|v-|\+|-|\+5v|\+3v3|power|vbat|bat\+|bat-)(\.\d+)?$/i;

export function isPowerPin(name: string): boolean {
  return POWER_RE.test(name.trim());
}

export function isGroundPin(name: string): boolean {
  return /^(gnd|vss|agnd|dgnd|-|bat-)(\.\d+)?$/i.test(name.trim());
}

/** Part position lookup over a circuit (boards + components). */
export function positions(circuit: CircuitLike): Map<string, Point> {
  const m = new Map<string, Point>();
  for (const b of circuit.boards) m.set(b.id, { x: b.x, y: b.y });
  for (const c of circuit.components) m.set(c.id, { x: c.x, y: c.y });
  return m;
}

export interface ResolvedEnd {
  partId: string;
  pin: PinGeom;
  abs: Point;
  side: Side;
  body: Rect;
  foot: Rect;
}

export function resolveEnd(
  geoms: GeomMap,
  pos: Map<string, Point>,
  end: { componentId: string; pinName: string },
): ResolvedEnd | null {
  const g = geoms.get(end.componentId);
  const p = pos.get(end.componentId);
  if (!g || !p) return null;
  const pin = findPin(g, end.pinName);
  if (!pin) return null;
  return { partId: g.id, pin, abs: pinAbs(g, p, pin), side: pinSide(g, pin), body: bodyRect(g, p), foot: footRect(g, p) };
}

/**
 * The polyline the canvas draws for a wire: start → waypoints → end, with an
 * L (horizontal first) between any two points that are not axis-aligned —
 * exactly generateOrthogonalPath's rule.
 */
export function renderedPolyline(start: Point, waypoints: Point[], end: Point): Point[] {
  const pts = [start, ...waypoints, end];
  const out: Point[] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const cur = pts[i];
    if (prev.x !== cur.x && prev.y !== cur.y) out.push({ x: cur.x, y: prev.y });
    out.push(cur);
  }
  return out;
}

/** Drop repeated and collinear points. */
export function simplify(pts: Point[]): Point[] {
  const dedup: Point[] = [];
  for (const p of pts) {
    const last = dedup[dedup.length - 1];
    if (!last || Math.abs(last.x - p.x) > 1e-6 || Math.abs(last.y - p.y) > 1e-6) dedup.push(p);
  }
  if (dedup.length < 3) return dedup;
  const out: Point[] = [dedup[0]];
  for (let i = 1; i < dedup.length - 1; i++) {
    const a = out[out.length - 1];
    const b = dedup[i];
    const c = dedup[i + 1];
    const collinear =
      (Math.abs(a.x - b.x) < 1e-6 && Math.abs(b.x - c.x) < 1e-6) ||
      (Math.abs(a.y - b.y) < 1e-6 && Math.abs(b.y - c.y) < 1e-6);
    if (!collinear) out.push(b);
  }
  out.push(dedup[dedup.length - 1]);
  return out;
}

/** Union-find nets over wire endpoints (`part:pin`, with GND ≡ GND.1). */
export function netsOf(circuit: CircuitLike, geoms: GeomMap): Map<string, number> {
  const parent = new Map<string, string>();
  const key = (e: { componentId: string; pinName: string }) => {
    const g = geoms.get(e.componentId);
    const pin = g ? findPin(g, e.pinName) : undefined;
    return `${e.componentId}:${pin?.name ?? e.pinName}`;
  };
  const find = (k: string): string => {
    let r = k;
    while (parent.get(r) !== r) r = parent.get(r)!;
    parent.set(k, r);
    return r;
  };
  const add = (k: string) => {
    if (!parent.has(k)) parent.set(k, k);
  };
  for (const w of circuit.wires) {
    const a = key(w.start);
    const b = key(w.end);
    add(a);
    add(b);
    parent.set(find(a), find(b));
  }
  const ids = new Map<string, number>();
  const byWire = new Map<string, number>();
  for (const w of circuit.wires) {
    const r = find(key(w.start));
    if (!ids.has(r)) ids.set(r, ids.size);
    byWire.set(w.id, ids.get(r)!);
  }
  return byWire;
}

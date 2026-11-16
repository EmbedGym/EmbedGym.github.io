/**
 * Layout quality metrics, computed from the same polylines the canvas draws.
 */

import {
  bodyRect,
  netsOf,
  positions,
  renderedPolyline,
  rectGap,
  resolveEnd,
  type CircuitLike,
  type GeomMap,
  type Point,
  type Rect,
} from './geometry';
import { GROUND_COLOR, SUPPLY_COLOR, looksLikePower, wireKinds } from './colors';

export interface LayoutMetrics {
  wires: number;
  /** Proper crossings between wires of different nets. */
  crossings: number;
  /** Total drawn wire length, px. */
  length: number;
  /** Collinear overlap between different nets, px. */
  overlapPx: number;
  /** Wires that run across a part body (beyond the pin's own exit). */
  wiresOverBodies: number;
  /** Length of wire drawn over part bodies, px. */
  overBodyPx: number;
  /** Smallest body-to-body gap, px (negative = overlap). */
  minClearance: number;
  bends: number;
  /**
   * (wire, pin) pairs where the wire passes within PIN_CLEARANCE of a pin that
   * is not one of its own endpoints — the "which pin does this land on?" defect.
   */
  pinPasses: number;
  /** Of those, passes closer than PIN_CLEARANCE_TIGHT: over or touching the pin. */
  pinPassesTight: number;
  pinPassList: string[];
  /** Supply/ground wires: drawn length beyond Manhattan distance, summed (px). */
  powerExcess: number;
  /** Worst supply/ground wire: drawn length / Manhattan distance. */
  powerDetourMax: number;
  /**
   * Same-net junctions where it is unclear which wire continues: a wire's
   * bend or end lying on another same-net wire's run (a T), counted once per
   * point, plus same-net wires running on top of each other (px). Wires that
   * merely meet at the pin they both end on are not counted.
   */
  tees: number;
  sameNetOverlapPx: number;
  /** Wires whose colour breaks the convention (colors.ts). */
  colourBad: number;
}

export const PIN_CLEARANCE = 6;
/** Below this a wire visibly touches the pin (half the 2.54 mm pitch is 4.8). */
export const PIN_CLEARANCE_TIGHT = 4.5;

/** Every pin of every placed part, in canvas coordinates. */
export function allPins(circuit: CircuitLike, geoms: GeomMap): Array<{ x: number; y: number; key: string }> {
  const out: Array<{ x: number; y: number; key: string }> = [];
  for (const [id, p] of positions(circuit)) {
    const g = geoms.get(id);
    if (!g) continue;
    for (const pin of g.pins) out.push({ x: p.x + g.offset + pin.x, y: p.y + g.offset + pin.y, key: `${id}:${pin.name}` });
  }
  return out;
}

function distToSeg(p: Point, a: Point, b: Point): number {
  const x = Math.max(Math.min(a.x, b.x), Math.min(p.x, Math.max(a.x, b.x)));
  const y = Math.max(Math.min(a.y, b.y), Math.min(p.y, Math.max(a.y, b.y)));
  return Math.hypot(p.x - x, p.y - y);
}

type Seg = { a: Point; b: Point; wire: string; net: number };

function segLenInside(a: Point, b: Point, r: Rect): number {
  // Axis-aligned segment against a rect.
  if (a.y === b.y) {
    if (a.y <= r.y || a.y >= r.y + r.h) return 0;
    const lo = Math.max(Math.min(a.x, b.x), r.x);
    const hi = Math.min(Math.max(a.x, b.x), r.x + r.w);
    return Math.max(0, hi - lo);
  }
  if (a.x === b.x) {
    if (a.x <= r.x || a.x >= r.x + r.w) return 0;
    const lo = Math.max(Math.min(a.y, b.y), r.y);
    const hi = Math.min(Math.max(a.y, b.y), r.y + r.h);
    return Math.max(0, hi - lo);
  }
  return 0;
}

function shrink(r: Rect, m: number): Rect {
  return { x: r.x + m, y: r.y + m, w: r.w - 2 * m, h: r.h - 2 * m };
}

export function wirePolylines(circuit: CircuitLike, geoms: GeomMap): Map<string, Point[]> {
  const pos = positions(circuit);
  const out = new Map<string, Point[]>();
  for (const w of circuit.wires) {
    const a = resolveEnd(geoms, pos, w.start);
    const b = resolveEnd(geoms, pos, w.end);
    if (!a || !b) continue;
    out.set(w.id, renderedPolyline(a.abs, w.waypoints ?? [], b.abs));
  }
  return out;
}

export function measure(circuit: CircuitLike, geoms: GeomMap): LayoutMetrics {
  const pos = positions(circuit);
  const nets = netsOf(circuit, geoms);
  const polys = wirePolylines(circuit, geoms);

  const bodies: Array<{ id: string; r: Rect }> = [];
  for (const id of pos.keys()) {
    const g = geoms.get(id);
    if (g) bodies.push({ id, r: bodyRect(g, pos.get(id)!) });
  }

  const segs: Seg[] = [];
  let length = 0;
  let bends = 0;
  for (const w of circuit.wires) {
    const pl = polys.get(w.id);
    if (!pl) continue;
    for (let i = 1; i < pl.length; i++) {
      const s = { a: pl[i - 1], b: pl[i], wire: w.id, net: nets.get(w.id)! };
      const l = Math.abs(s.a.x - s.b.x) + Math.abs(s.a.y - s.b.y);
      if (l < 0.5) continue;
      segs.push(s);
      length += l;
    }
    bends += Math.max(0, pl.length - 2);
  }

  // One visual crossing per (net pair, point): overlapping same-net trunks count once.
  const crossingPts = new Set<string>();
  let overlapPx = 0;
  const EPS = 0.5;
  for (let i = 0; i < segs.length; i++) {
    for (let j = i + 1; j < segs.length; j++) {
      const s = segs[i];
      const t = segs[j];
      if (s.net === t.net) continue;
      const sh = Math.abs(s.a.y - s.b.y) < 1e-6;
      const th = Math.abs(t.a.y - t.b.y) < 1e-6;
      if (sh !== th) {
        const h = sh ? s : t;
        const v = sh ? t : s;
        const hx0 = Math.min(h.a.x, h.b.x), hx1 = Math.max(h.a.x, h.b.x);
        const vy0 = Math.min(v.a.y, v.b.y), vy1 = Math.max(v.a.y, v.b.y);
        if (v.a.x > hx0 + EPS && v.a.x < hx1 - EPS && h.a.y > vy0 + EPS && h.a.y < vy1 - EPS) {
          const [n1, n2] = s.net < t.net ? [s.net, t.net] : [t.net, s.net];
          crossingPts.add(`${n1}/${n2}@${Math.round(v.a.x)},${Math.round(h.a.y)}`);
        }
      } else if (sh) {
        if (Math.abs(s.a.y - t.a.y) < 2) {
          const lo = Math.max(Math.min(s.a.x, s.b.x), Math.min(t.a.x, t.b.x));
          const hi = Math.min(Math.max(s.a.x, s.b.x), Math.max(t.a.x, t.b.x));
          overlapPx += Math.max(0, hi - lo);
        }
      } else if (Math.abs(s.a.x - t.a.x) < 2) {
        const lo = Math.max(Math.min(s.a.y, s.b.y), Math.min(t.a.y, t.b.y));
        const hi = Math.min(Math.max(s.a.y, s.b.y), Math.max(t.a.y, t.b.y));
        overlapPx += Math.max(0, hi - lo);
      }
    }
  }

  // Over-body: a wire may cross its own part only as far as the pin's nearest edge.
  let wiresOverBodies = 0;
  let overBodyPx = 0;
  for (const w of circuit.wires) {
    const pl = polys.get(w.id);
    if (!pl) continue;
    const ends = [resolveEnd(geoms, pos, w.start)!, resolveEnd(geoms, pos, w.end)!];
    let total = 0;
    for (const { id, r } of bodies) {
      const inner = shrink(r, 2);
      let inside = 0;
      for (let i = 1; i < pl.length; i++) inside += segLenInside(pl[i - 1], pl[i], inner);
      for (const e of ends) {
        if (e.partId !== id) continue;
        const p = e.abs;
        inside -= Math.min(p.x - r.x, r.x + r.w - p.x, p.y - r.y, r.y + r.h - p.y) + 2;
      }
      total += Math.max(0, inside);
    }
    if (total > 4) wiresOverBodies++;
    overBodyPx += total;
  }

  const pins = allPins(circuit, geoms);
  const pinPassList: string[] = [];
  let pinPassesTight = 0;
  for (const w of circuit.wires) {
    const pl = polys.get(w.id);
    if (!pl) continue;
    const ends = [resolveEnd(geoms, pos, w.start)!, resolveEnd(geoms, pos, w.end)!];
    const own = new Set(ends.map((e) => `${e.partId}:${e.pin.name}`));
    for (const pin of pins) {
      if (own.has(pin.key) || ends.some((e) => Math.hypot(e.abs.x - pin.x, e.abs.y - pin.y) < 0.5)) continue;
      let d = Infinity;
      for (let i = 1; i < pl.length; i++) d = Math.min(d, distToSeg(pin, pl[i - 1], pl[i]));
      if (d < PIN_CLEARANCE) pinPassList.push(`${w.id}>${pin.key}@${d.toFixed(1)}`);
      if (d < PIN_CLEARANCE_TIGHT) pinPassesTight++;
    }
  }

  // Power detours.
  const kinds = wireKinds(circuit, geoms);
  let powerExcess = 0;
  let powerDetourMax = 1;
  for (const w of circuit.wires) {
    if (kinds.get(w.id) === 'signal') continue;
    const pl = polys.get(w.id);
    if (!pl || pl.length < 2) continue;
    let len = 0;
    for (let i = 1; i < pl.length; i++) len += Math.abs(pl[i].x - pl[i - 1].x) + Math.abs(pl[i].y - pl[i - 1].y);
    const a = pl[0];
    const b = pl[pl.length - 1];
    const man = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    powerExcess += Math.max(0, len - man);
    if (man > 40) powerDetourMax = Math.max(powerDetourMax, len / man);
  }

  // Same-net junctions.
  const teePts = new Set<string>();
  let sameNetOverlapPx = 0;
  const byNet = new Map<number, string[]>();
  for (const w of circuit.wires) byNet.set(nets.get(w.id)!, [...(byNet.get(nets.get(w.id)!) ?? []), w.id]);
  const onSegInterior = (p: Point, a: Point, b: Point) => {
    if (Math.abs(a.y - b.y) < 0.5 && Math.abs(p.y - a.y) < 1.5) return p.x > Math.min(a.x, b.x) + 1 && p.x < Math.max(a.x, b.x) - 1;
    if (Math.abs(a.x - b.x) < 0.5 && Math.abs(p.x - a.x) < 1.5) return p.y > Math.min(a.y, b.y) + 1 && p.y < Math.max(a.y, b.y) - 1;
    return false;
  };
  for (const ids of byNet.values()) {
    if (ids.length < 2) continue;
    for (const ia of ids) {
      const A = polys.get(ia);
      if (!A) continue;
      const ends = new Set([`${Math.round(A[0].x)},${Math.round(A[0].y)}`, `${Math.round(A[A.length - 1].x)},${Math.round(A[A.length - 1].y)}`]);
      for (const ib of ids) {
        if (ia === ib) continue;
        const B = polys.get(ib);
        if (!B) continue;
        const bEnds = [B[0], B[B.length - 1]].map((p) => `${Math.round(p.x)},${Math.round(p.y)}`);
        for (const p of A) {
          const k = `${Math.round(p.x)},${Math.round(p.y)}`;
          // An end of A on B's pin is a shared pin, not a junction.
          if (ends.has(k) && bEnds.includes(k)) continue;
          for (let i = 1; i < B.length; i++) if (onSegInterior(p, B[i - 1], B[i])) { teePts.add(k); break; }
        }
        if (ia < ib) {
          for (let i = 1; i < A.length; i++) for (let j = 1; j < B.length; j++) {
            const [a0, a1, b0, b1] = [A[i - 1], A[i], B[j - 1], B[j]];
            const ah = Math.abs(a0.y - a1.y) < 0.5, bh = Math.abs(b0.y - b1.y) < 0.5;
            if (ah && bh && Math.abs(a0.y - b0.y) < 2) {
              sameNetOverlapPx += Math.max(0, Math.min(Math.max(a0.x, a1.x), Math.max(b0.x, b1.x)) - Math.max(Math.min(a0.x, a1.x), Math.min(b0.x, b1.x)));
            } else if (!ah && !bh && Math.abs(a0.x - b0.x) < 2) {
              sameNetOverlapPx += Math.max(0, Math.min(Math.max(a0.y, a1.y), Math.max(b0.y, b1.y)) - Math.max(Math.min(a0.y, a1.y), Math.min(b0.y, b1.y)));
            }
          }
        }
      }
    }
  }

  let colourBad = 0;
  for (const w of circuit.wires) {
    const k = kinds.get(w.id);
    const c = w.color.toLowerCase();
    if (k === 'ground' ? c !== GROUND_COLOR : k === 'supply' ? c !== SUPPLY_COLOR : looksLikePower(c)) colourBad++;
  }

  let minClearance = Infinity;
  for (let i = 0; i < bodies.length; i++)
    for (let j = i + 1; j < bodies.length; j++)
      minClearance = Math.min(minClearance, rectGap(bodies[i].r, bodies[j].r));

  return {
    wires: circuit.wires.length,
    crossings: crossingPts.size,
    length: Math.round(length),
    overlapPx: Math.round(overlapPx),
    wiresOverBodies,
    overBodyPx: Math.round(overBodyPx),
    minClearance: Number.isFinite(minClearance) ? Math.round(minClearance) : 0,
    bends,
    pinPasses: pinPassList.length,
    pinPassesTight,
    powerExcess: Math.round(powerExcess),
    powerDetourMax: Math.round(powerDetourMax * 100) / 100,
    tees: teePts.size,
    sameNetOverlapPx: Math.round(sameNetOverlapPx),
    colourBad,
    pinPassList,
  };
}

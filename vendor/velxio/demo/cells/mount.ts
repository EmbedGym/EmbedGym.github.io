// Builds a cell's DOM from its circuit and returns seek(t). Part sizes and pin
// positions come from wireTidy's probe and wire paths from its polylines, the
// same geometry the canvas uses, so the cell and the task page agree.

import { ComponentRegistry } from '@velxio/services/ComponentRegistry';
import { DEFAULT_BOARD_ELEMENTS, probeGeometry } from '@velxio/utils/wireTidy/probe';
import { wirePolylines } from '@velxio/utils/wireTidy/metrics';
import { findPin, renderedPolyline, type CircuitLike, type GeomMap, type PinGeom, type Point } from '@velxio/utils/wireTidy/geometry';

import { sinceLast } from './anim';
import type { Cell, CellView, Rect } from './cell';
import './cells.css';

export const CELL_W = 590;
export const CELL_H = 288;
const CELL_PAD = 18;
const MAX_SCALE = 1.5;

// rgb triplets for the glow under a lit LED, by the LED's `color` property.
const GLOW_RGB: Record<string, string> = {
  red: '255,60,60',
  green: '60,255,120',
  lime: '120,255,90',
  yellow: '255,230,70',
  orange: '255,150,40',
  blue: '70,140,255',
  white: '240,240,255',
  purple: '190,90,255',
  cyan: '60,230,255',
};

type Led = HTMLElement & { value: boolean; brightness: number };

export interface MountedCell {
  /**
   * The circuit and geometry as drawn, with rotated parts flattened: each one
   * becomes an unrotated part whose element box and pins are where the canvas
   * shows them, so wireTidy's metrics can read it.
   */
  circuit: CircuitLike;
  geoms: GeomMap;
  seek(t: number): void;
}

/** An orthogonal polyline with rounded corners, like a routed jumper wire. */
export function roundedPath(points: Point[], radius = 9) {
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i - 1];
    const c = points[i];
    const n = points[i + 1];
    const inLen = Math.hypot(c.x - p.x, c.y - p.y);
    const outLen = Math.hypot(n.x - c.x, n.y - c.y);
    if (inLen === 0 || outLen === 0) continue;
    const r = Math.min(radius, inLen / 2, outLen / 2);
    const ax = c.x - ((c.x - p.x) / inLen) * r;
    const ay = c.y - ((c.y - p.y) / inLen) * r;
    const bx = c.x + ((n.x - c.x) / outLen) * r;
    const by = c.y + ((n.y - c.y) / outLen) * r;
    d += ` L ${ax} ${ay} Q ${c.x} ${c.y} ${bx} ${by}`;
  }
  const last = points[points.length - 1];
  return `${d} L ${last.x} ${last.y}`;
}

/**
 * An element's drawn size, measured before it joins the (transformed) cell.
 * Custom elements can report a host box smaller than what they draw (an
 * LCD1602 reports 18 px tall), so the largest shadow svg counts too.
 */
async function measureOffscreen(el: HTMLElement): Promise<{ w: number; h: number }> {
  const host = document.createElement('div');
  host.style.cssText = 'position:absolute;left:-30000px;top:0;visibility:hidden;';
  document.body.appendChild(host);
  host.appendChild(el);
  await (el as HTMLElement & { updateComplete?: Promise<unknown> }).updateComplete;
  await new Promise((r) => requestAnimationFrame(r));
  const r = el.getBoundingClientRect();
  let { width: w, height: h } = r;
  for (const svg of el.shadowRoot?.querySelectorAll('svg') ?? []) {
    const s = svg.getBoundingClientRect();
    if (s.width * s.height > w * h) ({ width: w, height: h } = s);
  }
  host.remove();
  return { w, h };
}

function createElement(tag: string, attrs: Record<string, string>, props: Record<string, unknown>): HTMLElement {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  for (const [k, v] of Object.entries(props)) (el as unknown as Record<string, unknown>)[k] = v;
  return el;
}

/**
 * Where two polylines that start at the same point stop running together, or
 * null if they part at once or one runs entirely along the other.
 */
export function divergence(a: Point[], b: Point[]): Point | null {
  const same = (p: Point, q: Point) => Math.abs(p.x - q.x) < 0.01 && Math.abs(p.y - q.y) < 0.01;
  if (!same(a[0], b[0])) throw new Error('divergence: polylines must start at the same point');
  let [i, j] = [1, 1];
  let at = a[0];
  let shared = 0;
  while (i < a.length && j < b.length) {
    const da = Math.hypot(a[i].x - at.x, a[i].y - at.y);
    const db = Math.hypot(b[j].x - at.x, b[j].y - at.y);
    if (da < 0.01) {
      i++;
      continue;
    }
    if (db < 0.01) {
      j++;
      continue;
    }
    const ua = { x: (a[i].x - at.x) / da, y: (a[i].y - at.y) / da };
    const ub = { x: (b[j].x - at.x) / db, y: (b[j].y - at.y) / db };
    if (!same(ua, ub)) return shared > 0 ? at : null;
    const step = Math.min(da, db);
    at = { x: at.x + ua.x * step, y: at.y + ua.y * step };
    shared += step;
  }
  return null;
}

/**
 * DynamicComponent's wrapper: padding and border around the element, then the
 * part's name label under it. A rotated part turns about this box's centre,
 * so it is laid out as on the canvas; the label takes its space but is hidden.
 */
function canvasWrapper(el: HTMLElement, label: string, rotation: number): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'cell-wrapper';
  if (rotation) wrapper.style.transform = `rotate(${rotation}deg)`;
  const container = document.createElement('div');
  container.appendChild(el);
  const labelEl = document.createElement('div');
  labelEl.className = 'cell-label';
  labelEl.textContent = label;
  wrapper.append(container, labelEl);
  return wrapper;
}

/** `p` turned by `deg` (a multiple of 90) about `c`, as CSS rotate() turns it. */
function rotateAbout(p: Point, c: Point, deg: number): Point {
  const turns = (((deg / 90) % 4) + 4) % 4;
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  const [rx, ry] = [
    [dx, dy],
    [-dy, dx],
    [-dx, -dy],
    [dy, -dx],
  ][turns];
  return { x: c.x + rx, y: c.y + ry };
}

export async function mountCell(root: HTMLElement, circuit: CircuitLike, cell: Cell): Promise<MountedCell> {
  if (circuit.boards.length !== 1) throw new Error(`a cell draws one board; this circuit has ${circuit.boards.length}`);

  const registry = ComponentRegistry.getInstance();
  await registry.loadPromise;
  const geoms = await probeGeometry(circuit);
  const board = circuit.boards[0];
  const ox = board.x;
  const oy = board.y;

  root.innerHTML = `
    <div class="cell-frame"></div>
    <div class="cell-content">
      <div class="cell-parts"></div>
      ${cell.decor?.html ?? ''}
      <svg class="cell-wires" viewBox="0 0 10 10"></svg>
      <div class="cell-glows"></div>
    </div>`;
  const content = root.querySelector('.cell-content') as HTMLElement;
  const partsLayer = root.querySelector('.cell-parts') as HTMLElement;
  const wiresLayer = root.querySelector('.cell-wires') as SVGSVGElement;
  const glowsLayer = root.querySelector('.cell-glows') as HTMLElement;

  // Element rectangles in cell coordinates, keyed by circuit or extra id.
  const rects = new Map<string, Rect>();
  const elements = new Map<string, HTMLElement>();
  /** Puts `child` (the element, or its canvas wrapper) with its top-left at x, y. */
  const place = (id: string, el: HTMLElement, child: HTMLElement, x: number, y: number) => {
    if (elements.has(id)) throw new Error(`two parts named ${id}`);
    const box = document.createElement('div');
    box.className = 'cell-part';
    box.dataset.id = id;
    box.style.left = `${x}px`;
    box.style.top = `${y}px`;
    box.appendChild(child);
    partsLayer.appendChild(box);
    elements.set(id, el);
  };

  const boardSpec = DEFAULT_BOARD_ELEMENTS[board.boardKind];
  if (!boardSpec) throw new Error(`no element for boardKind '${board.boardKind}'`);
  const boardEl = createElement(boardSpec.tag, boardSpec.attrs ?? {}, {});
  boardEl.style.display = 'block';
  place(board.id, boardEl, boardEl, 0, 0);
  rects.set(board.id, { x: 0, y: 0, w: geoms.get(board.id)!.w, h: geoms.get(board.id)!.h });

  const wrappers = new Map<string, { wrapper: HTMLElement; rotation: number }>();
  const ledColors = new Map<string, string>();
  for (const c of circuit.components) {
    const meta = registry.getById(c.metadataId);
    if (!meta) throw new Error(`metadataId '${c.metadataId}' is not in the registry`);
    const { rotation = 0, ...props } = (c.properties ?? {}) as { rotation?: number; [key: string]: unknown };
    if (rotation % 90) throw new Error(`${c.id}: rotation ${rotation} is not a multiple of 90`);
    const el = createElement(meta.tagName, {}, props);
    const label = props.pin !== undefined ? `Pin ${props.pin}` : meta.name;
    const wrapper = canvasWrapper(el, label, rotation);
    place(c.id, el, wrapper, c.x - ox, c.y - oy);
    wrappers.set(c.id, { wrapper, rotation });
    if (meta.tagName === 'wokwi-led') ledColors.set(c.id, String(props.color ?? 'red'));
  }

  for (const extra of cell.extras?.parts ?? []) {
    if (!extra.tag === !extra.html) throw new Error(`extra ${extra.id}: give exactly one of tag or html`);
    const el = extra.tag ? createElement(extra.tag, extra.attrs ?? {}, extra.props ?? {}) : document.createElement('div');
    if (extra.html) el.innerHTML = extra.html;
    const size = await measureOffscreen(el);
    const pins = extra.html
      ? Object.entries(extra.pins ?? {}).map(([name, p]) => ({ name, ...p }))
      : (el as HTMLElement & { pinInfo?: PinGeom[] }).pinInfo ?? [];
    geoms.set(extra.id, { id: extra.id, kind: 'component', offset: 0, w: size.w, h: size.h, pins });
    el.style.display = 'block';
    place(extra.id, el, el, extra.x, extra.y);
    rects.set(extra.id, { x: extra.x, y: extra.y, w: size.w, h: size.h });
  }

  // Let the elements render, and the labels' and decor's fonts load, before
  // anything reads their state or size.
  await Promise.all([...elements.values()].map((el) => (el as HTMLElement & { updateComplete?: Promise<unknown> }).updateComplete));
  for (const { wrapper } of wrappers.values()) void wrapper.offsetWidth;
  await Promise.all(['400 16px Inter', '700 16px Inter', "400 16px 'JetBrains Mono'", "700 16px 'JetBrains Mono'"].map((f) => document.fonts.load(f)));
  await document.fonts.ready;

  // Element boxes and pins where the canvas draws them (calculatePinPosition):
  // the element sits `offset` inside its wrapper, which turns about its centre.
  const flatComponents = circuit.components.map((c) => {
    const geom = geoms.get(c.id)!;
    const { wrapper, rotation } = wrappers.get(c.id)!;
    const x = c.x - ox + geom.offset;
    const y = c.y - oy + geom.offset;
    if (!rotation) {
      rects.set(c.id, { x, y, w: geom.w, h: geom.h });
      return c;
    }
    const pivot = { x: c.x - ox + wrapper.offsetWidth / 2, y: c.y - oy + wrapper.offsetHeight / 2 };
    const a = rotateAbout({ x, y }, pivot, rotation);
    const b = rotateAbout({ x: x + geom.w, y: y + geom.h }, pivot, rotation);
    const r = { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) };
    rects.set(c.id, r);
    const pins = geom.pins.map((p) => {
      const q = rotateAbout({ x: x + p.x, y: y + p.y }, pivot, rotation);
      return { ...p, x: q.x - r.x, y: q.y - r.y };
    });
    geoms.set(c.id, { id: c.id, kind: 'component', offset: geom.offset, w: r.w, h: r.h, pins });
    const { rotation: _, ...props } = c.properties ?? {};
    return { ...c, x: r.x + ox - geom.offset, y: r.y + oy - geom.offset, properties: props };
  });
  const flat: CircuitLike = { ...circuit, components: flatComponents };

  const leds: { el: Led; glow: HTMLElement }[] = [];
  for (const [id, color] of ledColors) {
    const rgb = GLOW_RGB[color];
    if (!rgb) throw new Error(`${id}: no glow colour for LED colour '${color}'`);
    if (wrappers.get(id)!.rotation) throw new Error(`${id}: the glow does not follow a rotated LED`);
    const r = rects.get(id)!;
    const glow = document.createElement('div');
    glow.className = 'cell-glow';
    glow.style.left = `${r.x + r.w / 2}px`;
    glow.style.top = `${r.y + 14}px`;
    glow.style.setProperty('--rgb', rgb);
    glowsLayer.appendChild(glow);
    leds.push({ el: elements.get(id) as Led, glow });
  }

  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
  const grow = (ax: number, ay: number, bx: number, by: number) => {
    x0 = Math.min(x0, ax);
    y0 = Math.min(y0, ay);
    x1 = Math.max(x1, bx);
    y1 = Math.max(y1, by);
  };
  // The frame holds the parts, their wires, the decor and the stretch of header in use; the rest
  // of the board runs off the card, so small parts stay legible.
  for (const [id, r] of rects) if (id !== board.id) grow(r.x, r.y, r.x + r.w, r.y + r.h);
  if (cell.decor?.bounds) grow(...cell.decor.bounds);

  const pinAt = (id: string, name: string): Point => {
    const geom = geoms.get(id);
    if (!geom) throw new Error(`no part ${id}`);
    const pin = findPin(geom, name);
    if (!pin) throw new Error(`${id} has no pin ${name}`);
    const r = rects.get(id)!;
    return { x: r.x + pin.x, y: r.y + pin.y };
  };

  const polylines = wirePolylines(flat, geoms);
  const wirePaths = new Map<string, { halo: SVGPathElement; wire: SVGPathElement }>();
  const svgNs = 'http://www.w3.org/2000/svg';
  const drawWire = (id: string | undefined, points: Point[], color: string) => {
    for (const p of points) grow(p.x, p.y, p.x, p.y);
    const d = roundedPath(points);
    const halo = document.createElementNS(svgNs, 'path');
    halo.setAttribute('class', 'cell-wire-halo');
    halo.setAttribute('d', d);
    const wire = document.createElementNS(svgNs, 'path');
    wire.setAttribute('class', 'cell-wire');
    wire.setAttribute('d', d);
    wire.style.stroke = color;
    wiresLayer.append(halo, wire);
    if (id === undefined) return;
    if (wirePaths.has(id)) throw new Error(`two wires named ${id}`);
    wirePaths.set(id, { halo, wire });
  };
  for (const w of circuit.wires) {
    const line = polylines.get(w.id);
    if (!line) throw new Error(`wire ${w.id}: an endpoint does not resolve to a pin`);
    drawWire(w.id, line.map((p) => ({ x: p.x - ox, y: p.y - oy })), w.color);
  }
  for (const w of cell.extras?.wires ?? []) {
    drawWire(w.id, renderedPolyline(pinAt(...w.from), w.via ?? [], pinAt(...w.to)), w.color);
  }

  // A dot where wires from one pin run together and then split, as on a schematic.
  const ends = circuit.wires.flatMap((w) => {
    const line = polylines.get(w.id)!.map((p) => ({ x: p.x - ox, y: p.y - oy }));
    return [
      { pin: `${w.start.componentId}:${w.start.pinName}`, line, color: w.color },
      { pin: `${w.end.componentId}:${w.end.pinName}`, line: [...line].reverse(), color: w.color },
    ];
  });
  for (let i = 0; i < ends.length; i++) {
    for (let j = i + 1; j < ends.length; j++) {
      if (ends[i].pin !== ends[j].pin) continue;
      const at = divergence(ends[i].line, ends[j].line);
      if (!at) continue;
      const dot = document.createElementNS(svgNs, 'circle');
      dot.setAttribute('class', 'cell-junction');
      dot.setAttribute('cx', String(at.x));
      dot.setAttribute('cy', String(at.y));
      dot.setAttribute('r', '4.6');
      dot.style.fill = ends[i].color;
      wiresLayer.append(dot);
    }
  }

  const boardBox = rects.get(board.id)!;
  for (const w of circuit.wires) {
    for (const end of [w.start, w.end]) {
      if (end.componentId !== board.id) continue;
      // The pin plus its printed label, which sits inboard of the header, away from the nearest edge.
      const p = pinAt(board.id, end.pinName);
      const edge = Math.min(p.y, boardBox.h - p.y, p.x, boardBox.w - p.x);
      if (edge === p.y) grow(p.x - 10, p.y - 10, p.x + 10, p.y + 55);
      else if (edge === boardBox.h - p.y) grow(p.x - 10, p.y - 55, p.x + 10, p.y + 10);
      else if (edge === p.x) grow(p.x - 10, p.y - 10, p.x + 45, p.y + 10);
      else if (edge === boardBox.w - p.x) grow(p.x - 45, p.y - 10, p.x + 10, p.y + 10);
      else throw new Error(`pin ${end.pinName}: no nearest edge`);
    }
  }
  const scale = Math.min(MAX_SCALE, (CELL_W - 2 * CELL_PAD) / (x1 - x0), (CELL_H - 2 * CELL_PAD) / (y1 - y0));
  const left = (CELL_W - scale * (x1 - x0)) / 2 - scale * x0;
  const top = (CELL_H - scale * (y1 - y0)) / 2 - scale * y0;
  content.style.transform = `translate(${left}px, ${top}px) scale(${scale})`;
  root.dataset.scale = scale.toFixed(2);

  // Halo brightness per wire for the frame being drawn.
  const glow = new Map<string, number>();
  const view: CellView = {
    part: <T>(id: string) => {
      const el = elements.get(id);
      if (!el) throw new Error(`no part ${id}`);
      return el as T;
    },
    box: (id) => {
      const r = rects.get(id);
      if (!r) throw new Error(`no part ${id}`);
      return { ...r };
    },
    pin: pinAt,
    q: <T>(sel: string) => {
      const el = content.querySelector(sel);
      if (!el) throw new Error(`no ${sel} in cell`);
      return el as T;
    },
    qa: <T>(sel: string) => [...content.querySelectorAll(sel)] as T[],
    glowWire: (id, amount) => {
      if (!wirePaths.has(id)) throw new Error(`no wire ${id}`);
      glow.set(id, Math.max(glow.get(id) ?? 0, amount));
    },
  };

  const activity = (cell.activity ?? []).map((a) => {
    for (const id of a.wires) if (!wirePaths.has(id)) throw new Error(`activity names unknown wire ${id}`);
    return a;
  });

  cell.setup?.(view);

  const power = boardEl as HTMLElement & { ledPower?: boolean };
  return {
    circuit: flat,
    geoms,
    seek(t) {
      if ('ledPower' in power) power.ledPower = true;
      glow.clear();
      cell.run(t, view);
      for (const a of activity) {
        const busy = Math.exp(-sinceLast(t, a.at) / 180);
        for (const id of a.wires) view.glowWire(id, busy);
      }
      for (const [id, { halo }] of wirePaths) {
        const busy = glow.get(id);
        if (busy) halo.style.setProperty('--busy', String(busy));
        else halo.style.removeProperty('--busy');
      }
      for (const { el, glow } of leds) glow.style.opacity = String(el.value ? el.brightness : 0);
    },
  };
}

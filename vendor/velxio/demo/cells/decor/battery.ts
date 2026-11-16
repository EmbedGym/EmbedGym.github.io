import type { ExtraPart } from '../cell';
import { BRASS, BRASS_EDGE, METAL_EDGE, PLASTIC_DARK, PLASTIC_DARK_EDGE, RED, type DecorSample } from './common';

type Dir = 'right' | 'down' | 'left' | 'up';
type Point = { x: number; y: number };

export interface BatteryOptions {
  /** The way the brass + end points. */
  plus?: Dir;
  /**
   * Where the two leads come out: `ends`, − from one end and + from the other;
   * `plus-end`, both from the + end; or a direction across the pack, both from
   * that long side; or `across`, + from the long side clockwise of the + end
   * (below it when + points right) at the + corner, and − from the other long
   * side at the body's middle.
   */
  leads?: 'ends' | 'plus-end' | 'across' | Dir;
  scale?: number;
}

const ROTATE: Record<Dir, number> = { right: 0, down: 90, left: 180, up: 270 };
const UNIT: Record<Dir, Point> = { right: { x: 1, y: 0 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, up: { x: 0, y: -1 } };
const LEN = 72;
const THICK = 28;
const LEAD = 6;

// Clockwise by `deg`, in screen coordinates (y down).
function turn({ x, y }: Point, deg: number): Point {
  if (deg === 0) return { x, y };
  if (deg === 90) return { x: -y, y: x };
  if (deg === 180) return { x: -x, y: -y };
  if (deg === 270) return { x: y, y: -x };
  throw new Error(`turn: ${deg}°`);
}

// Lead stubs in the pack's own frame, + end on the right: [pos, neg], each from the body out to the pin.
function leadsInFrame(leads: BatteryOptions['leads'], rotate: number): [Point, Point][] {
  if (leads === 'ends')
    return [
      [{ x: LEN, y: THICK / 2 }, { x: LEN + LEAD, y: THICK / 2 }],
      [{ x: 0, y: THICK / 2 }, { x: -LEAD, y: THICK / 2 }],
    ];
  if (leads === 'across')
    return [
      [{ x: 70, y: THICK - 2 }, { x: 70, y: THICK + LEAD }],
      [{ x: 36, y: 0 }, { x: 36, y: -LEAD }],
    ];
  if (leads === 'plus-end')
    return [
      [{ x: LEN, y: 21 }, { x: LEN + LEAD, y: 21 }],
      [{ x: LEN, y: 7 }, { x: LEN + LEAD, y: 7 }],
    ];
  const toward = turn(UNIT[leads!], (360 - rotate) % 360);
  if (toward.x !== 0) throw new Error(`battery: leads '${leads}' run along the pack, not across it`);
  const y = toward.y > 0 ? THICK : 0;
  const out = toward.y > 0 ? THICK + LEAD : -LEAD;
  return [
    [{ x: 62, y }, { x: 62, y: out }],
    [{ x: 10, y }, { x: 10, y: out }],
  ];
}

/**
 * The 12 V battery pack as an extra part with pins `pos` and `neg`: a 72 x 28
 * dark body with a brass + end, plus 6 px leads, times `scale`. (x, y) is the
 * top-left of the whole drawing, leads included.
 */
export function batteryPart(id: string, x: number, y: number, { plus = 'right', leads = 'ends', scale = 1 }: BatteryOptions = {}): ExtraPart {
  const rotate = ROTATE[plus];
  const stubs = leadsInFrame(leads, rotate);
  const corners = [{ x: 0, y: 0 }, { x: LEN, y: THICK }, ...stubs.flat()].map((p) => turn(p, rotate));
  const minX = Math.min(...corners.map((p) => p.x));
  const minY = Math.min(...corners.map((p) => p.y));
  const w = Math.max(...corners.map((p) => p.x)) - minX;
  const h = Math.max(...corners.map((p) => p.y)) - minY;
  const pin = (p: Point) => {
    const q = turn(p, rotate);
    return { x: (q.x - minX) * scale, y: (q.y - minY) * scale };
  };
  const label = turn({ x: 26, y: THICK / 2 }, rotate);
  const sign = turn({ x: 62, y: THICK / 2 }, rotate);
  const upright = rotate === 90 || rotate === 270 ? -90 : 0;
  const html = `
    <svg class="d-battery" data-battery="${id}" viewBox="${minX} ${minY} ${w} ${h}" width="${w * scale}" height="${h * scale}" overflow="visible">
      <g transform="rotate(${rotate})">
        ${stubs.map(([a, b]) => `<path d="M ${a.x} ${a.y} L ${b.x} ${b.y}" stroke="${METAL_EDGE}" stroke-width="2.6" />`).join('')}
        <rect x="0.75" y="0.75" width="${LEN - 1.5}" height="${THICK - 1.5}" rx="5" fill="${PLASTIC_DARK}" stroke="${PLASTIC_DARK_EDGE}" stroke-width="1.5" />
        <path d="M 52 0.75 H ${LEN - 5.75} A 5 5 0 0 1 ${LEN - 0.75} 5.75 V ${THICK - 5.75} A 5 5 0 0 1 ${LEN - 5.75} ${THICK - 0.75} H 52 Z" fill="${BRASS}" stroke="${BRASS_EDGE}" stroke-width="1.5" />
      </g>
      <text x="${label.x}" y="${label.y}" transform="rotate(${upright} ${label.x} ${label.y})" text-anchor="middle" dominant-baseline="central" font-family="Inter, sans-serif" font-size="14" font-weight="700" fill="#fff">12V</text>
      <text x="${sign.x}" y="${sign.y + 1}" text-anchor="middle" dominant-baseline="central" font-family="Inter, sans-serif" font-size="15" font-weight="800" fill="${PLASTIC_DARK}">+</text>
    </svg>`;
  return { id, x, y, html, pins: { pos: pin(stubs[0][1]), neg: pin(stubs[1][1]) } };
}

// The part with its pins marked, + red, for checking in the gallery.
function sample(name: string, w: number, h: number, opts: BatteryOptions): DecorSample {
  const part = batteryPart(name, 12, 12, opts);
  const dot = (p: Point, color: string) =>
    `<div style="position:absolute;left:${part.x + p.x - 2.5}px;top:${part.y + p.y - 2.5}px;width:5px;height:5px;border-radius:50%;background:${color}"></div>`;
  return {
    name: `battery: ${name}`,
    w,
    h,
    html: `<div style="position:absolute;left:${part.x}px;top:${part.y}px">${part.html}</div>${dot(part.pins!.pos, RED)}${dot(part.pins!.neg, PLASTIC_DARK)}`,
  };
}

export const samples: DecorSample[] = [
  sample('plus right, leads at the ends', 108, 52, {}),
  sample('plus left, leads at the ends', 108, 52, { plus: 'left' }),
  sample('plus right, leads up', 96, 58, { leads: 'up' }),
  sample('plus right, leads down', 96, 58, { leads: 'down' }),
  sample('plus down, leads out of the plus end', 52, 108, { plus: 'down', leads: 'plus-end' }),
  sample('plus up, leads left', 58, 96, { plus: 'up', leads: 'left' }),
  sample('plus right, leads across', 96, 64, { leads: 'across' }),
  sample('plus down, leads at the ends, scale 1.5', 66, 148, { plus: 'down', scale: 1.5 }),
];

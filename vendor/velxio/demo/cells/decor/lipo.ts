import { clamp } from '../anim';
import { CHARGE, CHARGE_LOW, METAL_EDGE, METAL_LIGHT, PLASTIC_DARK, RED, TEXT, type DecorSample, type DecorView } from './common';

/** The LiPo's natural size, lead included, and where its lead leaves the pouch. */
export const LIPO = { w: 100, h: 82, pouchH: 52, leadX: 28 };

/** Which way the lead runs from the pouch to its tip. */
export type LipoLead = 'down' | 'up' | 'right';

/**
 * A LiPo pouch cell whose red/black lead runs from its pouch and ends at
 * (x, y), the point to put on a JST connector. At scale 1 the pouch is
 * 100 x 52 and the lead 30 long. `lead` says which way the lead runs into the
 * connector; the pouch and its label stay upright:
 * - 'down' (default): the pouch spans x − 28 … x + 72 and y − 82 … y − 30;
 * - 'up', for a connector opening downward: x − 72 … x + 28 and y + 30 … y + 82;
 * - 'right', for one opening left: x − 130 … x − 30 and y − 26 … y + 26.
 * A label and a charge fill on the pouch are set with `setLipo`.
 */
export function lipo(key: string, opts: { x: number; y: number; scale?: number; lead?: LipoLead }): string {
  const s = opts.scale ?? 1;
  const { w, pouchH, leadX } = LIPO;
  const leadLen = LIPO.h - pouchH;
  const dir = opts.lead ?? 'down';
  // The box (bw x bh), the pouch's top-left in it, the tip in it, and the two wires (red first), turned with the lead.
  let bw: number, bh: number, pouch: { x: number; y: number }, tip: { x: number; y: number }, wires: string[];
  if (dir === 'down') {
    [bw, bh, pouch, tip] = [w, LIPO.h, { x: 0, y: 0 }, { x: leadX, y: LIPO.h }];
    wires = [-4, 4].map((d) => `M ${tip.x + d} ${pouchH} V ${tip.y}`);
  } else if (dir === 'up') {
    [bw, bh, pouch, tip] = [w, LIPO.h, { x: 0, y: leadLen }, { x: w - leadX, y: 0 }];
    wires = [4, -4].map((d) => `M ${tip.x + d} ${leadLen} V 0`);
  } else if (dir === 'right') {
    [bw, bh, pouch, tip] = [w + leadLen, pouchH, { x: 0, y: 0 }, { x: w + leadLen, y: pouchH / 2 }];
    wires = [4, -4].map((d) => `M ${w} ${tip.y + d} H ${tip.x}`);
  } else {
    throw new Error(`lipo ${key}: unknown lead direction ${dir}`);
  }
  return `
    <div data-lipo="${key}" style="position:absolute;left:${opts.x - tip.x * s}px;top:${opts.y - tip.y * s}px;width:${bw * s}px;height:${bh * s}px">
      <svg viewBox="0 0 ${bw} ${bh}" width="${bw * s}" height="${bh * s}" style="position:absolute;left:0;top:0">
        <rect x="${pouch.x + 0.8}" y="${pouch.y + 0.8}" width="${w - 1.6}" height="${pouchH - 1.6}" rx="8" fill="${METAL_LIGHT}" stroke="${METAL_EDGE}" stroke-width="1.6" />
        <rect data-lipo-fill x="${pouch.x + 5}" y="${pouch.y + 5}" width="0" height="${pouchH - 10}" rx="5" fill="${CHARGE}" />
        <path d="${wires[0]}" stroke="${RED}" stroke-width="3" />
        <path d="${wires[1]}" stroke="${PLASTIC_DARK}" stroke-width="3" />
      </svg>
      <div data-lipo-label style="position:absolute;left:${pouch.x * s}px;top:${pouch.y * s}px;width:${w * s}px;height:${pouchH * s}px;display:flex;align-items:center;justify-content:center;font:700 ${24 * s}px/1 var(--mono);color:${TEXT}"></div>
    </div>`;
}

/**
 * Shows `label` on LiPo `key` and fills the pouch to `level` (0..1), red below
 * 20 %; a null level leaves it unfilled, for a reading that is not a charge.
 */
export function setLipo(view: DecorView, key: string, level: number | null, label: string) {
  const root = view.q<HTMLElement>(`[data-lipo="${key}"]`);
  const fill = root.querySelector('[data-lipo-fill]')!;
  fill.setAttribute('width', String((LIPO.w - 10) * clamp(level ?? 0)));
  fill.setAttribute('fill', level !== null && level < 0.2 ? CHARGE_LOW : CHARGE);
  root.querySelector<HTMLElement>('[data-lipo-label]')!.textContent = label;
}

export const samples: DecorSample[] = [
  {
    name: 'lipo: charge draining',
    w: 120,
    h: 100,
    html: lipo('charge', { x: 38, y: 92 }),
    duration: 3000,
    play: (view, t) => {
      const level = 0.9 - 0.8 * (t / 3000);
      setLipo(view, 'charge', level, `${Math.round(level * 100)}%`);
    },
  },
  {
    name: 'lipo: voltage, small',
    w: 120,
    h: 100,
    html: lipo('volts', { x: 34, y: 82, scale: 0.75 }),
    play: (view) => setLipo(view, 'volts', null, '3.70 V'),
  },
  {
    name: 'lipo: upside down, charging',
    w: 120,
    h: 100,
    html: lipo('flip', { x: 82, y: 8, lead: 'up' }),
    duration: 3000,
    play: (view, t) => {
      const level = 0.3 + 0.6 * (t / 3000);
      setLipo(view, 'flip', level, `${Math.round(level * 100)}%`);
    },
  },
  {
    name: 'lipo: lead to the right',
    w: 140,
    h: 70,
    html: lipo('side', { x: 135, y: 35, lead: 'right' }),
    play: (view) => setLipo(view, 'side', 0.6, '60%'),
  },
];

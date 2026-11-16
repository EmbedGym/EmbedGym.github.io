import type { ExtraPart } from '../cell';
import {
  BRASS,
  GEARBOX,
  GEARBOX_EDGE,
  GEARBOX_INK,
  METAL,
  METAL_EDGE,
  METAL_LIGHT,
  TREAD,
  TYRE,
  uid,
  type DecorSample,
  type DecorView,
} from './common';

const W = 44;
const H = 100;
const TREAD_STEP = 8;

/**
 * A TT gear motor seen from above, standing upright as an extra part 44 x 100
 * times `scale` with its top-left at (x, y): the tyre (edge-on) on top, the
 * yellow gearbox, then the can. Pins `a` and `b` stick out of the bottom edge,
 * `pitch` apart (natural px) about the centre line: `a` right, `b` left. Spread
 * `pitch` to match a driver's terminal pitch so both wires drop straight.
 * `label` is a letter on the gearbox (A, L, R…). `pins: 'top'` turns the motor
 * upside down (tyre at the bottom, `a` left, `b` right) for wires that come from
 * above. Turn the tyre with `setMotor`.
 */
export function motorPart(id: string, x: number, y: number, opts: { scale?: number; pitch?: number; label?: string; pins?: 'bottom' | 'top' } = {}): ExtraPart {
  const scale = opts.scale ?? 1;
  const pitch = opts.pitch ?? 14;
  const a = W / 2 + pitch / 2;
  const b = W / 2 - pitch / 2;
  const top = opts.pins === 'top';
  const pin = (p: number) => (top ? { x: (W - p) * scale, y: 0 } : { x: p * scale, y: H * scale });
  return {
    id,
    x,
    y,
    pins: { a: pin(a), b: pin(b) },
    html: motorSvg(id, scale, a, b, opts.label ?? '', top),
  };
}

function motorSvg(id: string, scale: number, a: number, b: number, label: string, top: boolean): string {
  const tyre = uid('motor-tyre');
  // One stripe past each end so a shift of up to one step never shows a gap.
  const stripes = Array.from({ length: 8 }, (_, i) => `<rect x="${W - i * TREAD_STEP + 1}" y="2" width="3" height="14" fill="${TREAD}" />`).join('');
  return `
    <svg class="d-motor" data-motor="${id}" viewBox="0 0 ${W} ${H}" width="${W * scale}" height="${H * scale}" overflow="visible">
      <g${top ? ` transform="rotate(180 ${W / 2} ${H / 2})"` : ''}>
      <defs><clipPath id="${tyre}"><rect x="0" y="0" width="${W}" height="18" rx="4" /></clipPath></defs>
      <rect x="0" y="0" width="${W}" height="18" rx="4" fill="${TYRE}" />
      <g clip-path="url(#${tyre})"><g class="d-motor-tread">${stripes}</g></g>
      <rect x="19" y="18" width="6" height="7" fill="${METAL_EDGE}" />
      <rect x="8" y="25" width="28" height="42" rx="3" fill="${GEARBOX}" stroke="${GEARBOX_EDGE}" stroke-width="1.4" />
      <rect x="10" y="66" width="24" height="28" rx="5" fill="${METAL}" stroke="${METAL_EDGE}" stroke-width="1.2" />
      <rect x="25" y="68" width="5" height="24" rx="2" fill="${METAL_LIGHT}" />
      <rect x="${a - 2}" y="94" width="4" height="6" fill="${BRASS}" />
      <rect x="${b - 2}" y="94" width="4" height="6" fill="${BRASS}" />
      </g>
      ${label ? `<text x="22" y="${top ? 65 : 57}" text-anchor="middle" font-family="Inter, sans-serif" font-size="30" font-weight="800" fill="${GEARBOX_INK}">${label}</text>` : ''}
    </svg>`;
}

/**
 * Sets motor `id`'s tyre for this frame: `travel` is how far its tread has
 * rolled, natural px, positive forward. A loop that ends on a whole multiple of
 * 8 px of travel restarts seamlessly.
 */
export function setMotor(view: DecorView, id: string, travel: number) {
  const shift = ((travel % TREAD_STEP) + TREAD_STEP) % TREAD_STEP;
  view.q<SVGGElement>(`[data-motor="${id}"] .d-motor-tread`).setAttribute('transform', `translate(${-shift} 0)`);
}

const at = (part: ExtraPart, left: number, top: number) => `<div style="position:absolute;left:${left}px;top:${top}px">${part.html}</div>`;

export const samples: DecorSample[] = [
  {
    name: 'motor: forward',
    w: 140,
    h: 150,
    html: at(motorPart('s1', 0, 0, { label: 'A' }), 16, 20) + at(motorPart('s2', 0, 0, { scale: 1.3, pitch: 16.6 }), 70, 10),
    duration: 2000,
    play: (view, t) => {
      setMotor(view, 's1', (t / 2000) * 40);
      setMotor(view, 's2', (t / 2000) * 80);
    },
  },
  {
    name: 'motor: pins on top',
    w: 80,
    h: 130,
    html: at(motorPart('s5', 0, 0, { label: 'A', pins: 'top' }), 18, 15),
    duration: 2000,
    play: (view, t) => setMotor(view, 's5', (t / 2000) * 40),
  },
  {
    name: 'motor: L and R, reverse',
    w: 120,
    h: 130,
    html: at(motorPart('s3', 0, 0, { label: 'L' }), 12, 15) + at(motorPart('s4', 0, 0, { label: 'R' }), 64, 15),
    duration: 2000,
    play: (view, t) => {
      setMotor(view, 's3', (t / 2000) * 40);
      setMotor(view, 's4', -(t / 2000) * 40);
    },
  },
];

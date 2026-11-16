import { clamp } from '../anim';
import { BLUE, METAL, METAL_EDGE, type DecorSample, type DecorView } from './common';

const RINGS = [31, 40];
const HALF_ANGLE = 0.6;

/**
 * Vibration arcs either side of a vibrating motor, centred on the element's
 * (0, 0): place it at the motor disc's centre. Hidden until `setVibration`.
 */
export function vibration(key: string, scale = 1): string {
  const [c, s] = [Math.cos(HALF_ANGLE), Math.sin(HALF_ANGLE)];
  const arcs = RINGS.flatMap((r, ring) => [
    `<path data-ring="${ring}" d="M ${-r * c} ${-r * s} A ${r} ${r} 0 0 0 ${-r * c} ${r * s}" />`,
    `<path data-ring="${ring}" d="M ${r * c} ${-r * s} A ${r} ${r} 0 0 1 ${r * c} ${r * s}" />`,
  ]).join('');
  return `
    <svg class="d-vibration" data-vibration="${key}" width="1" height="1" overflow="visible" style="position:absolute;left:0;top:0">
      <g transform="scale(${scale})" fill="none" stroke="${BLUE}" stroke-width="4" stroke-linecap="round">${arcs}</g>
    </svg>`;
}

/**
 * Shows vibration `key` at `level` 0..1: the inner arcs appear first, the outer
 * ones past about half, both full at 1. Pass 1 for an on/off motor and a falling
 * level to let the arcs linger after a short buzz.
 */
export function setVibration(view: DecorView, key: string, level: number) {
  const svg = view.q<SVGSVGElement>(`[data-vibration="${key}"]`);
  svg.querySelectorAll<SVGPathElement>('path').forEach((arc) => {
    const inner = arc.dataset.ring === '0';
    arc.style.opacity = String(inner ? clamp(level * 3) : clamp(level * 2 - 0.6));
  });
}

const disc = `<div style="position:absolute;left:-22px;top:-22px;width:44px;height:44px;border-radius:50%;background:${METAL};border:1.5px solid ${METAL_EDGE};box-sizing:border-box"></div>`;

export const samples: DecorSample[] = [
  {
    name: 'vibration: swell and fade',
    w: 120,
    h: 100,
    html: `<div style="position:absolute;left:60px;top:50px">${disc}${vibration('s')}</div>`,
    duration: 2400,
    play: (view, t) => setVibration(view, 's', t < 1200 ? t / 1000 : 1 - (t - 1200) / 1000),
  },
  {
    name: 'vibration: on/off buzz',
    w: 120,
    h: 100,
    html: `<div style="position:absolute;left:60px;top:50px">${disc}${vibration('b')}</div>`,
    duration: 1200,
    play: (view, t) => setVibration(view, 'b', t >= 300 && t < 700 ? 1 : 0),
  },
];

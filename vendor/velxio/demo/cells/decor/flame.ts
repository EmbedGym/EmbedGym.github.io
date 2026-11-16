import { FLAME, FLAME_CORE, WARM, type DecorSample, type DecorView } from './common';

export type FlameKind = 'tongue' | 'blaze';
export type FlameDir = 'up' | 'right' | 'left';

// Drawn pointing up from the base at (0, 0). A tongue is a lighter's or a
// candle's flame, 26 tall; a blaze is a fire's, three tongues 48 wide.
const SHAPES: Record<FlameKind, { outer: string; core: string }> = {
  tongue: {
    outer: 'M 0 0 C -7 -2 -8 -12 0 -26 C 8 -12 7 -2 0 0 Z',
    core: 'M 0 0 C -3.5 -1 -4 -7 0 -14 C 4 -7 3.5 -1 0 0 Z',
  },
  blaze: {
    outer: 'M -16 -1 C -24 -17 -12 -27 -8 -41 C -2 -27 6 -23 4 -9 C 10 -17 14 -25 14 -33 C 24 -19 28 -9 22 1 Z',
    core: 'M -8 1 C -12 -9 -4 -17 -2 -25 C 2 -15 10 -13 8 1 Z',
  },
};
const TURN: Record<FlameDir, number> = { up: 0, right: 90, left: -90 };

/**
 * A flame whose base is at the element's (0, 0), pointing `dir`. Hidden until
 * `runFlame` gives it a size.
 */
export function flame(key: string, opts: { kind?: FlameKind; dir?: FlameDir; scale?: number } = {}): string {
  const { kind = 'tongue', dir = 'up', scale = 1 } = opts;
  const shape = SHAPES[kind];
  return `
    <svg class="d-flame" data-flame="${key}" width="1" height="1" overflow="visible" style="position:absolute;left:0;top:0">
      <g transform="rotate(${TURN[dir]}) scale(${scale})">
        <g class="d-flame-body" transform="scale(0)">
          <path d="${shape.outer}" fill="${FLAME}" stroke="${WARM}" stroke-width="1.2" stroke-linejoin="round" />
          <path d="${shape.core}" fill="${FLAME_CORE}" />
        </g>
      </g>
    </svg>`;
}

/** The shared flicker: a flame's width and height factors at `t`; `k` offsets one flame from another. */
export function flicker(t: number, k = 0): [number, number] {
  return [1 + 0.08 * Math.sin(t / 37 + k * 2) + 0.05 * Math.sin(t / 23), 1 + 0.12 * Math.sin(t / 29 + k)];
}

/** Draws flame `key` at `size` (0 out, 1 full), flickering. */
export function runFlame(view: DecorView, key: string, t: number, size: number, k = 0) {
  const [w, h] = flicker(t, k);
  view.q<SVGGElement>(`[data-flame="${key}"] .d-flame-body`).setAttribute('transform', `scale(${size * w} ${size * h})`);
}

const at = (x: number, y: number, html: string) => `<div style="position:absolute;left:${x}px;top:${y}px">${html}</div>`;
const grow = (t: number) => Math.min(1, t / 300, (2400 - t) / 300);

export const samples: DecorSample[] = [
  {
    name: 'flame: tongue, up/right/left',
    w: 150,
    h: 60,
    html: at(25, 45, flame('up')) + at(55, 30, flame('right', { dir: 'right' })) + at(125, 30, flame('left', { dir: 'left' })),
    duration: 2400,
    play: (view, t) => ['up', 'right', 'left'].forEach((key, k) => runFlame(view, key, t, grow(t), k)),
  },
  {
    name: 'flame: blaze',
    w: 80,
    h: 70,
    html: at(40, 60, flame('blaze', { kind: 'blaze' })),
    duration: 2400,
    play: (view, t) => runFlame(view, 'blaze', t, grow(t)),
  },
];

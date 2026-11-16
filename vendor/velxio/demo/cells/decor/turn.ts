import { INK, type DecorSample, type DecorView } from './common';

type Point = { x: number; y: number };

/** A curved arrow over a turning object. Hidden until `setTurn` draws it; coordinates are the cell's. */
export function turn(key: string): string {
  return `
    <svg data-turn="${key}" width="1" height="1" style="position:absolute;left:0;top:0;overflow:visible;pointer-events:none">
      <g opacity="0">
        <path d="M -20 4 A 20 20 0 0 1 20 -2" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round" />
        <path d="M 13 -3 L 27 -3 L 20 8 Z" fill="${INK}" stroke="${INK}" stroke-width="2" stroke-linejoin="round" />
      </g>
    </svg>`;
}

/**
 * Draws arrow `key` arched over `at`, 20 px (times `scale`) in radius,
 * pointing clockwise for `dir` 1 and anticlockwise for -1. `amount` is its
 * opacity, 0 to 1.
 */
export function setTurn(view: DecorView, key: string, at: Point, dir: 1 | -1, amount: number, scale = 1) {
  const g = view.q<SVGGElement>(`[data-turn="${key}"] g`);
  g.setAttribute('transform', `translate(${at.x} ${at.y}) scale(${dir * scale} ${scale})`);
  g.setAttribute('opacity', String(0.9 * amount));
}

const knob = `<div style="position:absolute;left:54px;top:44px;width:32px;height:32px;border-radius:50%;background:#2f3640"></div>`;

export const samples: DecorSample[] = [
  { name: 'turn: clockwise', w: 140, h: 100, html: knob + turn('s'), play: (view) => setTurn(view, 's', { x: 70, y: 60 }, 1, 1, 1.8) },
  { name: 'turn: anticlockwise', w: 140, h: 100, html: knob + turn('s'), play: (view) => setTurn(view, 's', { x: 70, y: 60 }, -1, 1, 1.8) },
];

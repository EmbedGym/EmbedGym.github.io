import { clamp, easeOutCubic, lerp, mulberry32 } from '../anim';
import { GAS, SMOKE, type DecorSample, type DecorView } from './common';

type Point = { x: number; y: number };
export type PuffKind = 'gas' | 'smoke';

/**
 * `count` puffs of gas or smoke. They are drawn in the coordinates of the
 * element holding this markup (a cell's decor layer), so `runPuffs` can send
 * them anywhere in it. Hidden until `runPuffs`.
 */
export function puffs(key: string, count: number, kind: PuffKind = 'gas'): string {
  const circles = '<circle r="0" opacity="0" />'.repeat(count);
  return `<svg class="d-puffs" data-puffs="${key}" width="1" height="1" overflow="visible" style="position:absolute;left:0;top:0" fill="${kind === 'gas' ? GAS : SMOKE}">${circles}</svg>`;
}

export interface PuffFlow {
  from: Point;
  to: Point;
  /** Puffs leave `from` evenly spread over [start, end) ms. */
  window: [number, number];
  /** Each puff's trip, ms. */
  flight?: number;
  /** Radius at `from` and at `to`. */
  size?: [number, number];
  /** Puffs fan out over this many px across their path by the time they arrive. */
  spread?: number;
  /** The path first rises this far above `from`, as smoke does, before it bends to `to`. */
  lift?: number;
  /** Peak opacity of one puff; scale it to show thinner or thicker gas. */
  opacity?: number;
  seed?: number;
}

/**
 * Sends puffs `key` from `from` to `to`: each leaves at its own time inside the
 * window, grows, drifts and fades as it arrives.
 */
export function runPuffs(view: DecorView, key: string, t: number, flow: PuffFlow) {
  const { from, to, window: [start, end], flight = 1400, size = [6, 30], spread = 34, lift = 0, opacity = 0.5, seed = 1 } = flow;
  const rand = mulberry32(seed);
  const circles = view.qa<SVGCircleElement>(`[data-puffs="${key}"] circle`);
  const bend = { x: from.x, y: Math.min(from.y, to.y) - lift };
  circles.forEach((puff, k) => {
    const born = start + ((rand() + k) / circles.length) * (end - start);
    const side = (rand() - 0.5) * spread;
    const age = (t - born) / flight;
    if (age < 0 || age > 1) {
      puff.setAttribute('opacity', '0');
      return;
    }
    const p = easeOutCubic(age);
    // A quadratic curve through the bend point; with no lift it is a straight line.
    const x = lift ? lerp(lerp(from.x, bend.x, p), lerp(bend.x, to.x, p), p) : lerp(from.x, to.x, p);
    const y = lift ? lerp(lerp(from.y, bend.y, p), lerp(bend.y, to.y, p), p) : lerp(from.y, to.y, p);
    puff.setAttribute('cx', String(x));
    puff.setAttribute('cy', String(y + side * p));
    puff.setAttribute('r', String(lerp(size[0], size[1], p)));
    puff.setAttribute('opacity', String(opacity * clamp(age * 6) * clamp((1 - age) * 3)));
  });
}

const dot = (x: number, y: number) => `<div style="position:absolute;left:${x - 3}px;top:${y - 3}px;width:6px;height:6px;border-radius:50%;background:#94a3b8"></div>`;

export const samples: DecorSample[] = [
  {
    name: 'puffs: gas stream',
    w: 170,
    h: 80,
    html: dot(10, 40) + dot(150, 40) + puffs('gas', 9),
    duration: 3000,
    play: (view, t) => runPuffs(view, 'gas', t, { from: { x: 10, y: 40 }, to: { x: 150, y: 40 }, window: [0, 1600] }),
  },
  {
    name: 'puffs: smoke rising, then drifting',
    w: 150,
    h: 120,
    html: dot(20, 110) + dot(130, 60) + puffs('smoke', 14, 'smoke'),
    duration: 3200,
    play: (view, t) =>
      runPuffs(view, 'smoke', t, { from: { x: 20, y: 110 }, to: { x: 130, y: 60 }, window: [0, 1800], size: [4, 14], spread: 16, lift: 60, opacity: 0.55, seed: 7 }),
  },
];

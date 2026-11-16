import { clamp } from '../anim';
import { COFFEE, ICE, ICE_EDGE, ICE_GLASS, ICE_WATER, STEAM, WARM, WARM_EDGE, type DecorSample, type DecorView } from './common';

export type MugKind = 'hot' | 'ice';

const STEAM_X = [11, 19, 27];

const hotSvg = `
  <g fill="none" stroke="${STEAM}" stroke-width="2.4" stroke-linecap="round">
    ${STEAM_X.map((x) => `<path class="d-mug-steam" d="M ${x} 13 q -4 -4 0 -8 q 4 -4 0 -8" />`).join('')}
  </g>
  <path d="M 34 28 h 3 a 7 7 0 0 1 0 16 h -3" fill="none" stroke="${WARM_EDGE}" stroke-width="3.5" />
  <path d="M 3 18 h 32 v 34 a 8 8 0 0 1 -8 8 h -16 a 8 8 0 0 1 -8 -8 Z" fill="${WARM}" stroke="${WARM_EDGE}" stroke-width="1.5" />
  <ellipse cx="19" cy="18.5" rx="15" ry="3" fill="${COFFEE}" />`;

const iceSvg = `
  <path d="M 4 14 L 38 14 L 34 62 L 8 62 Z" fill="${ICE_GLASS}" stroke="${ICE_EDGE}" stroke-width="1.6" stroke-linejoin="round" />
  <path d="M 6 24 L 36 24 L 34 60 L 9 60 Z" fill="${ICE_WATER}" />
  <rect x="11" y="27" width="10" height="10" rx="2" fill="${ICE}" stroke="${ICE_EDGE}" stroke-width="1.2" transform="rotate(-12 16 32)" />
  <rect x="22" y="33" width="10" height="10" rx="2" fill="${ICE}" stroke="${ICE_EDGE}" stroke-width="1.2" transform="rotate(14 27 38)" />
  <rect x="13" y="43" width="9" height="9" rx="2" fill="${ICE}" stroke="${ICE_EDGE}" stroke-width="1.2" />`;

/**
 * A hot mug with steam, or (`kind: 'ice'`) a glass of iced water: a 46 x 64
 * box times `scale`, its top-left at the element's (0, 0), standing on the box's
 * bottom edge. Animate it with `runMug`.
 */
export function mug(key: string, opts: { kind?: MugKind; scale?: number } = {}): string {
  const { kind = 'hot', scale = 1 } = opts;
  return `
    <svg class="d-mug" data-mug="${key}" viewBox="0 0 46 64" width="${46 * scale}" height="${64 * scale}" overflow="visible" style="position:absolute;left:0;top:0">
      ${kind === 'hot' ? hotSvg : iceSvg}
    </svg>`;
}

/**
 * Draws mug `key` at `t`. `heat` 0..1 sets how much steam rises (ignored for
 * ice). `away` 0..1 carries it off by (`dx`, `dy`) px, fading out: 0 is in
 * place, 1 is gone.
 */
export function runMug(view: DecorView, key: string, t: number, opts: { heat?: number; away?: number; dx?: number; dy?: number } = {}) {
  const { heat = 1, away = 0, dx = 0, dy = -24 } = opts;
  const svg = view.q<SVGSVGElement>(`[data-mug="${key}"]`);
  svg.style.transform = `translate(${dx * away}px, ${dy * away}px)`;
  svg.style.opacity = String(1 - away);
  svg.querySelectorAll<SVGPathElement>('.d-mug-steam').forEach((steam, k) => {
    const rise = (t / 25 + k * 5) % 8;
    steam.setAttribute('transform', `translate(0 ${-rise})`);
    steam.style.opacity = String(clamp(1 - rise / 8) * 0.9 * heat);
  });
}

const at = (x: number, y: number, html: string) => `<div style="position:absolute;left:${x}px;top:${y}px">${html}</div>`;
const shelf = (x: number, y: number, w: number) => `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:2px;background:#cfd6df"></div>`;

export const samples: DecorSample[] = [
  {
    name: 'mug: hot, set down and lifted',
    w: 70,
    h: 100,
    html: shelf(4, 90, 62) + at(12, 26, mug('hot')),
    duration: 3000,
    play: (view, t) => runMug(view, 'hot', t, { away: clamp(Math.max(1 - t / 400, (t - 2400) / 400)) }),
  },
  {
    name: 'mug: iced water',
    w: 70,
    h: 100,
    html: shelf(4, 90, 62) + at(12, 26, mug('ice', { kind: 'ice' })),
    duration: 1000,
    play: (view, t) => runMug(view, 'ice', t),
  },
  {
    name: 'mug: hot, scale 1.8, steam fading',
    w: 110,
    h: 130,
    html: shelf(4, 122, 100) + at(14, 6, mug('big', { scale: 1.8 })),
    duration: 3000,
    play: (view, t) => runMug(view, 'big', t, { heat: clamp(1 - t / 2400) }),
  },
];

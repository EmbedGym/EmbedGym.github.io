import { clamp, lerp } from '../anim';
import { GLASS, INK, MUTED, MURKY_SURFACE, MURKY_WATER, SALT, WATER, WATER_SURFACE, uid, type DecorSample, type DecorView } from './common';

const W = 52;
const HEIGHT = { cup: 52, tall: 70 };
const R = 10;
const GRAIN_XS = [14, 22, 29, 37];
const GRAIN_DELAYS = [0, 60, 20, 90];
const GRAIN_MS = 500;

/**
 * An open glass of water drawn over the circuit (a probe dipped in it shows
 * through), 52 wide and 52 (`cup`) or 70 (`tall`) high, times `scale`, its
 * top-left at (x, y) in cell coordinates. `salt` adds salt crystals for
 * `runSalt`. Set the water with `setWater`.
 */
export function waterGlass(key: string, x: number, y: number, opts: { scale?: number; kind?: keyof typeof HEIGHT; salt?: boolean } = {}): string {
  const scale = opts.scale ?? 1;
  const h = HEIGHT[opts.kind ?? 'cup'];
  const inside = uid('water-inside');
  const outline = (close: boolean) =>
    `M 0 0 V ${h - R} Q 0 ${h} ${R} ${h} H ${W - R} Q ${W} ${h} ${W} ${h - R} V 0${close ? ' Z' : ''}`;
  // A grain is a small salt cube, drawn as a tilted square so it does not read as a bubble.
  const grains = opts.salt
    ? GRAIN_XS.map(() => `<rect class="d-water-grain" x="-3" y="-3" width="6" height="6" rx="0.8" fill="${SALT}" stroke="${INK}" stroke-width="1.4" opacity="0" />`).join('')
    : '';
  return `
    <svg class="d-water" data-water="${key}" data-h="${h}" viewBox="0 0 ${W} ${h}" width="${W * scale}" height="${h * scale}" overflow="visible"
      style="position:absolute;left:${x}px;top:${y}px;pointer-events:none">
      <defs><clipPath id="${inside}"><path d="${outline(true)}" /></clipPath></defs>
      <g clip-path="url(#${inside})">
        <rect class="d-water-body" x="0" y="${h}" width="${W}" height="0" fill="${WATER}" />
        <line class="d-water-surface" x1="0" x2="${W}" y1="${h}" y2="${h}" stroke="${WATER_SURFACE}" stroke-width="1.8" />
        ${grains}
      </g>
      <path d="${outline(false)}" fill="${GLASS}" stroke="${MUTED}" stroke-width="1.8" stroke-linejoin="round" />
    </svg>`;
}

/**
 * Sets glass `key`'s water for this frame: `level` 0 (empty) to 1 (brim), and
 * `murk` 0 (clear) to 1 (muddy brown) for water that turns dirty.
 */
export function setWater(view: DecorView, key: string, level: number, murk = 0) {
  const svg = view.q<SVGSVGElement>(`[data-water="${key}"]`);
  const h = Number(svg.dataset.h);
  const top = h * (1 - clamp(level));
  const body = svg.querySelector('.d-water-body')!;
  body.setAttribute('y', String(top));
  body.setAttribute('height', String(h - top));
  body.setAttribute('fill', murk > 0 ? mix(WATER, MURKY_WATER, clamp(murk)) : WATER);
  const surface = svg.querySelector('.d-water-surface')!;
  surface.setAttribute('y1', String(top));
  surface.setAttribute('y2', String(top));
  surface.setAttribute('stroke', murk > 0 ? mix(WATER_SURFACE, MURKY_SURFACE, clamp(murk)) : WATER_SURFACE);
}

/**
 * Drops a pinch of salt into glass `key` (built with `salt`) at each time in
 * `pinches`: the crystals sink from the surface at `level` to the bottom and
 * dissolve (fade) on the way, 0.6 s per pinch.
 */
export function runSalt(view: DecorView, key: string, t: number, pinches: number[], level: number) {
  const svg = view.q<SVGSVGElement>(`[data-water="${key}"]`);
  const h = Number(svg.dataset.h);
  const top = h * (1 - clamp(level));
  const pinch = pinches.filter((p) => t >= p).pop();
  svg.querySelectorAll<SVGRectElement>('.d-water-grain').forEach((grain, i) => {
    const p = pinch === undefined ? 1 : clamp((t - pinch - GRAIN_DELAYS[i]) / GRAIN_MS);
    grain.setAttribute('transform', `translate(${GRAIN_XS[i]} ${lerp(top + 3, h - 6, p)}) rotate(${20 + i * 25})`);
    grain.setAttribute('opacity', p > 0 && p < 1 ? String(1 - p * 0.8) : '0');
  });
}

function mix(from: string, to: string, k: number): string {
  const a = rgba(from);
  const b = rgba(to);
  const c = a.map((v, i) => lerp(v, b[i], k));
  return `rgba(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])}, ${c[3].toFixed(3)})`;
}

function rgba(colour: string): number[] {
  if (colour.startsWith('#')) return [1, 3, 5].map((i) => parseInt(colour.slice(i, i + 2), 16)).concat(1);
  if (colour.startsWith('rgba(')) return colour.slice(5, -1).split(',').map(Number);
  throw new Error(`water: cannot mix colour ${colour}`);
}

export const samples: DecorSample[] = [
  {
    name: 'water: fill and drain',
    w: 160,
    h: 100,
    html: waterGlass('s1', 14, 20) + waterGlass('s2', 90, 10, { kind: 'tall' }),
    duration: 3000,
    play: (view, t) => {
      const level = t < 1500 ? clamp(t / 1000) * 0.8 : 0.8 * (1 - clamp((t - 1800) / 1000));
      setWater(view, 's1', level);
      setWater(view, 's2', 0.25 + 0.5 * Math.abs(Math.sin((Math.PI * t) / 3000)));
    },
  },
  {
    name: 'water: salt pinches',
    w: 90,
    h: 90,
    html: waterGlass('s3', 18, 18, { salt: true }),
    duration: 3000,
    play: (view, t) => {
      setWater(view, 's3', 0.75, t < 2700 ? Math.floor(t / 900) / 3 : 0);
      runSalt(view, 's3', t, [0, 900, 1800], 0.75);
    },
  },
];

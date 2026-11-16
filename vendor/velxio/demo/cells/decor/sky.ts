import { clamp, lerp } from '../anim';
import {
  BLUE,
  BREATH,
  BREATH_EDGE,
  CLOUD,
  CLOUD_EDGE,
  MOON,
  MOON_EDGE,
  SUN,
  SUN_EDGE,
  SUN_RAY,
  UV,
  type DecorSample,
  type DecorView,
} from './common';

type Point = { x: number; y: number };

const place = (el: HTMLElement, at: Point, opacity: number) => {
  el.style.transform = `translate(${at.x}px, ${at.y}px)`;
  el.style.opacity = String(opacity);
};

/** Which light the sun's rays show: visible, ultraviolet, or the two alternating. */
export type SunRays = 'light' | 'uv' | 'both';

/**
 * The sun, a disc with eight rays, 92 px across times `scale`, centred on the
 * element's (0, 0). Hidden until `setSun` places it.
 */
export function sun(key: string, opts: { rays?: SunRays; scale?: number } = {}): string {
  const s = opts.scale ?? 1;
  const rays = opts.rays ?? 'light';
  const lines = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4;
    const color = rays === 'uv' || (rays === 'both' && i % 2) ? UV : SUN_RAY;
    return `<line x1="${30 * Math.cos(a)}" y1="${30 * Math.sin(a)}" x2="${42 * Math.cos(a)}" y2="${42 * Math.sin(a)}" stroke="${color}" stroke-width="4" stroke-linecap="round" />`;
  }).join('');
  return `
    <div data-sun="${key}" style="position:absolute;left:0;top:0;opacity:0">
      <svg viewBox="-46 -46 92 92" width="${92 * s}" height="${92 * s}" style="position:absolute;left:${-46 * s}px;top:${-46 * s}px">
        <g class="d-sun-rays">${lines}</g>
        <circle r="22" fill="${SUN}" stroke="${SUN_EDGE}" stroke-width="1.8" />
      </svg>
    </div>`;
}

/**
 * Centres sun `key` on `at`. `brightness` 1 is full sun; towards 0 the rays
 * fade out and the disc pales (to 35%), as behind a cloud or at dusk. `turn`
 * spins the rays, in degrees; `opacity` 0 hides it all.
 */
export function setSun(view: DecorView, key: string, at: Point, opts: { brightness?: number; turn?: number; opacity?: number } = {}) {
  const { brightness = 1, turn = 0, opacity = 1 } = opts;
  const el = view.q<HTMLElement>(`[data-sun="${key}"]`);
  place(el, at, opacity);
  const rays = el.querySelector<SVGGElement>('.d-sun-rays')!;
  rays.setAttribute('transform', `rotate(${turn})`);
  rays.style.opacity = String(brightness);
  el.querySelector<SVGCircleElement>('circle')!.style.opacity = String(lerp(0.35, 1, brightness));
}

/** A crescent moon about 52 px across times `scale`, centred on the element's (0, 0). Hidden until `setMoon` places it. */
export function moon(key: string, opts: { scale?: number } = {}): string {
  const s = opts.scale ?? 1;
  return `
    <div data-moon="${key}" style="position:absolute;left:0;top:0;opacity:0">
      <svg viewBox="-30 -30 60 60" width="${60 * s}" height="${60 * s}" style="position:absolute;left:${-30 * s}px;top:${-30 * s}px">
        <path d="M 8 -26 A 26 26 0 1 0 22 14 A 20 20 0 1 1 8 -26 Z" fill="${MOON}" stroke="${MOON_EDGE}" stroke-width="1.6" stroke-linejoin="round" />
      </svg>
    </div>`;
}

/** Centres moon `key` on `at` at `opacity`. */
export function setMoon(view: DecorView, key: string, at: Point, opacity = 1) {
  place(view.q<HTMLElement>(`[data-moon="${key}"]`), at, opacity);
}

/** `cloud`: a grey rain-free cloud; `breath`: a warm, humid breath with drops falling out of it. */
export type CloudKind = 'cloud' | 'breath';

const PUFFS = `
  <circle cx="36" cy="38" r="22" />
  <circle cx="64" cy="28" r="26" />
  <circle cx="90" cy="40" r="18" />
  <rect x="28" y="38" width="66" height="22" rx="11" />`;

/**
 * A cloud 120 x 64 px times `scale` (the breath's drops hang 26 px lower),
 * centred on the element's (0, 0). Hidden until `setCloud` places it.
 */
export function cloud(key: string, opts: { kind?: CloudKind; scale?: number } = {}): string {
  const s = opts.scale ?? 1;
  const breath = opts.kind === 'breath';
  const drops = breath
    ? `<g fill="${BLUE}">
        <path d="M 40 66 q -6 9 0 12 q 6 -3 0 -12 Z" />
        <path d="M 64 72 q -6 9 0 12 q 6 -3 0 -12 Z" />
        <path d="M 86 64 q -5 8 0 11 q 5 -3 0 -11 Z" />
      </g>`
    : '';
  // A wide outline under a fill-only copy leaves one outline round the whole silhouette.
  return `
    <div data-cloud="${key}" style="position:absolute;left:0;top:0;opacity:0">
      <svg viewBox="0 0 120 90" width="${120 * s}" height="${90 * s}" style="position:absolute;left:${-60 * s}px;top:${-32 * s}px">
        <g fill="${breath ? BREATH : CLOUD}" stroke="${breath ? BREATH_EDGE : CLOUD_EDGE}" stroke-width="3.6">${PUFFS}</g>
        <g fill="${breath ? BREATH : CLOUD}">${PUFFS}</g>
        ${drops}
      </svg>
    </div>`;
}

/** Centres cloud `key` on `at` at `opacity`. */
export function setCloud(view: DecorView, key: string, at: Point, opacity = 1) {
  place(view.q<HTMLElement>(`[data-cloud="${key}"]`), at, opacity);
}

// 0 clear, 1 with the cloud in front of the sun, over the sample's 4 s loop.
const cover = (t: number) => clamp(1 - Math.abs(t - 2000) / 1200);

export const samples: DecorSample[] = [
  ...(['light', 'uv', 'both'] as const).map((rays) => ({
    name: `sky: sun, ${rays} rays`,
    w: 100,
    h: 100,
    html: sun(rays, { rays }),
    duration: 4000,
    play: (view: DecorView, t: number) => setSun(view, rays, { x: 50, y: 50 }, { turn: (t / 4000) * 45 }),
  })),
  {
    name: 'sky: cloud over the sun',
    w: 160,
    h: 110,
    html: sun('dim', { rays: 'both' }) + cloud('over'),
    duration: 4000,
    play: (view, t) => {
      const c = cover(t);
      setSun(view, 'dim', { x: 80, y: 55 }, { brightness: 1 - 0.85 * c, turn: (t / 4000) * 45 });
      setCloud(view, 'over', { x: lerp(50, 110, clamp((t - 800) / 2400)), y: 60 }, c);
    },
  },
  {
    name: 'sky: day to night',
    w: 100,
    h: 110,
    html: sun('day') + moon('night'),
    duration: 4000,
    play: (view, t) => {
      const dark = clamp(1 - Math.abs(t - 2000) / 1000);
      setSun(view, 'day', { x: 50, y: 55 + 12 * dark }, { opacity: clamp(1 - 2 * dark), turn: (t / 4000) * 45 });
      setMoon(view, 'night', { x: 50, y: 55 + 12 * (1 - dark) }, clamp(2 * dark - 1));
    },
  },
  {
    name: 'sky: breath',
    w: 140,
    h: 100,
    html: cloud('breath', { kind: 'breath' }),
    duration: 3000,
    play: (view, t) => setCloud(view, 'breath', { x: lerp(90, 50, t / 3000), y: 40 }, clamp(Math.min(t, 3000 - t) / 500)),
  },
];

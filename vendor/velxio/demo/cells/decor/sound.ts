import { clamp } from '../anim';
import { SOUND, type DecorSample, type DecorView } from './common';

type Point = { x: number; y: number };

/** Which way the rings travel; `all` draws whole circles. */
export type SoundDir = 'up' | 'down' | 'left' | 'right' | 'all';

const SLOTS = 3;
const HALF_ANGLE = 0.42;
const CENTRE: Record<Exclude<SoundDir, 'all'>, number> = { up: -Math.PI / 2, down: Math.PI / 2, left: Math.PI, right: 0 };

/** Sound rings out of a buzzer (or a clap). Hidden until `setSound` draws them; coordinates are the cell's. */
export function sound(key: string): string {
  return `
    <svg data-sound="${key}" width="1" height="1" style="position:absolute;left:0;top:0;overflow:visible;pointer-events:none">
      ${`<path fill="none" stroke="${SOUND}" stroke-linecap="round" opacity="0" />`.repeat(SLOTS)}
    </svg>`;
}

export interface SoundOpts {
  dir?: SoundDir;
  /** Ring radius as it leaves and as it fades, px. Defaults 24 and 60. */
  from?: number;
  to?: number;
  /** How many rings sound in all (a single beep); unlimited by default. */
  count?: number;
  /** The tone was already sounding at waves 0 (a loop that closes mid-tone), so earlier rings are still out. */
  ongoing?: boolean;
  scale?: number;
}

/**
 * Draws rings `key` centred on `at` (the buzzer disc's centre). `waves` is how
 * many rings have left so far, a running count that grows while it sounds
 * (e.g. `since / 200` for one ring every 200 ms); null hides them. Each ring
 * lives for three waves, fading out as it spreads.
 */
export function setSound(view: DecorView, key: string, at: Point, waves: number | null, opts: SoundOpts = {}) {
  const { dir = 'up', from = 24, to = 60, count = Infinity, ongoing = false, scale = 1 } = opts;
  const rings = view.qa<SVGPathElement>(`[data-sound="${key}"] path`);
  const newest = waves === null ? -1 : Math.floor(waves);
  rings.forEach((ring, slot) => {
    // Slot `slot` holds the newest ring whose index is congruent to it.
    const i = newest - ((((newest - slot) % SLOTS) + SLOTS) % SLOTS);
    const p = waves === null ? 1 : (waves - i) / SLOTS;
    if ((i < 0 && !ongoing) || i >= count || p >= 1) {
      ring.setAttribute('opacity', '0');
      return;
    }
    const r = scale * (from + (to - from) * (1 - (1 - p) ** 2));
    ring.setAttribute('d', ringPath(at, r, dir));
    ring.setAttribute('stroke-width', String(4 * scale));
    ring.setAttribute('opacity', String(0.9 * (1 - p) * clamp(p * 6)));
  });
}

function ringPath(at: Point, r: number, dir: SoundDir): string {
  if (dir === 'all') return `M ${at.x - r} ${at.y} A ${r} ${r} 0 1 1 ${at.x + r} ${at.y} A ${r} ${r} 0 1 1 ${at.x - r} ${at.y}`;
  const a0 = CENTRE[dir] - HALF_ANGLE;
  const a1 = CENTRE[dir] + HALF_ANGLE;
  return `M ${at.x + r * Math.cos(a0)} ${at.y + r * Math.sin(a0)} A ${r} ${r} 0 0 1 ${at.x + r * Math.cos(a1)} ${at.y + r * Math.sin(a1)}`;
}

const disc = (x: number, y: number) =>
  `<div style="position:absolute;left:${x - 16}px;top:${y - 16}px;width:32px;height:32px;border-radius:50%;background:#2f3640"></div>`;

const steady = (dir: SoundDir, x: number, y: number): DecorSample => ({
  name: `sound: ${dir}`,
  w: 140,
  h: 140,
  html: disc(x, y) + sound('s'),
  duration: 1800,
  play: (view, t) => setSound(view, 's', { x, y }, t < 1500 ? t / 200 : null, { dir }),
});

export const samples: DecorSample[] = [
  steady('up', 70, 110),
  steady('down', 70, 30),
  steady('left', 110, 70),
  steady('right', 30, 70),
  steady('all', 70, 70),
  {
    name: 'sound: one beep, three rings',
    w: 140,
    h: 140,
    html: disc(70, 110) + sound('s'),
    duration: 1200,
    play: (view, t) => setSound(view, 's', { x: 70, y: 110 }, t >= 200 ? (t - 200) / 120 : null, { count: 3 }),
  },
  {
    name: 'sound: ongoing tone, seamless loop',
    w: 140,
    h: 140,
    html: disc(30, 70) + sound('s'),
    duration: 1800,
    play: (view, t) => setSound(view, 's', { x: 30, y: 70 }, t / 200, { dir: 'right', ongoing: true }),
  },
];

import { clamp, easeInOutCubic, lerp } from '../anim';
import { MUTED, NAIL, NAIL_EDGE, SKIN, SKIN_EDGE, uid, type DecorSample, type DecorView } from './common';

type Point = { x: number; y: number };

export interface FingerOptions {
  /** Pad to the faded top, px before `scale`; at least 36. */
  length?: number;
  /** Degrees clockwise: 0 points down, 90 left, 180 up, 270 right. Any angle works. */
  rotate?: number;
  scale?: number;
}

/**
 * A fingertip, its pad at the element's (0, 0) once `pressFinger` or
 * `tapFinger` places it. The drop shadow always falls downwards.
 */
export function finger(key: string, { length = 96, rotate = 0, scale = 1 }: FingerOptions = {}): string {
  if (length < 36) throw new Error(`finger '${key}': length ${length} leaves no room for the nail`);
  const fade = uid('finger-fade');
  const mask = uid('finger-mask');
  const L = length;
  const w = 40 * scale;
  const h = (L + 4) * scale;
  const creases = L >= 64 ? `<path d="M -9 -50 Q 0 -46 9 -50 M -8 -55 Q 0 -51 8 -55" fill="none" stroke="${SKIN_EDGE}" stroke-width="1.2" stroke-linecap="round" />` : '';
  return `
    <div class="d-finger" data-finger="${key}" data-pad-x="${20 * scale}" data-pad-y="${L * scale}" data-rotate="${rotate}" data-scale="${scale}"
      style="position:absolute;left:0;top:0;width:${w}px;height:${h}px;filter:drop-shadow(0 3px 3px rgba(15, 23, 42, 0.25))">
      <svg viewBox="-20 ${-L} 40 ${L + 4}" width="${w}" height="${h}" style="display:block;overflow:visible;transform:rotate(${rotate}deg);transform-origin:${20 * scale}px ${L * scale}px">
        <defs>
          <linearGradient id="${fade}" x1="0" y1="${-L}" x2="0" y2="${-L + Math.min(46, 0.48 * L)}" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="#fff" stop-opacity="0" />
            <stop offset="1" stop-color="#fff" stop-opacity="1" />
          </linearGradient>
          <mask id="${mask}" maskUnits="userSpaceOnUse" x="-20" y="${-L}" width="40" height="${L + 4}">
            <rect x="-20" y="${-L}" width="40" height="${L + 4}" fill="url(#${fade})" />
          </mask>
        </defs>
        <g mask="url(#${mask})">
          <path d="M -14 ${-L} V -14 A 14 14 0 0 0 14 -14 V ${-L} Z" fill="${SKIN}" stroke="${SKIN_EDGE}" stroke-width="1.5" />
          <rect x="-8.5" y="-31" width="17" height="21" rx="7" fill="${NAIL}" stroke="${NAIL_EDGE}" stroke-width="1.2" />
          ${creases}
        </g>
      </svg>
    </div>`;
}

export interface PressOptions {
  /** Hover height above the target, px; default 26 times the finger's scale. */
  lift?: number;
}

const MOVE = 150;

/**
 * Pressing a membrane keypad's 42 px keys: the finger's tilt, and where its pad
 * lands relative to the key's centre. It leans right, off the pressed key's label.
 */
export const KEYPAD = { rotate: 30, aim: { x: 18, y: 17 } };

/**
 * Moves finger `key` so its pad presses `at` during each [down, up] interval
 * and hovers above it, back along the finger, otherwise. Returns whether it is
 * pressing at `t`.
 */
export function pressFinger(view: DecorView, key: string, t: number, at: Point, presses: [number, number][], opts: PressOptions = {}): boolean {
  const el = view.q<HTMLElement>(`[data-finger="${key}"]`);
  const scale = Number(el.dataset.scale);
  const LIFT = opts.lift ?? 26 * scale;
  let lift = LIFT;
  let pressing = false;
  for (const [down, up] of presses) {
    if (t >= down - MOVE && t < down) lift = Math.min(lift, LIFT * (1 - easeInOutCubic((t - (down - MOVE)) / MOVE)));
    if (t >= down && t < up) {
      lift = -3 * scale;
      pressing = true;
    }
    if (t >= up && t < up + MOVE) lift = Math.min(lift, LIFT * easeInOutCubic((t - up) / MOVE));
  }
  const a = (Number(el.dataset.rotate) * Math.PI) / 180;
  const x = at.x - Number(el.dataset.padX) + Math.sin(a) * lift;
  const y = at.y - Number(el.dataset.padY) - Math.cos(a) * lift;
  el.style.transform = `translate(${x}px, ${y}px)`;
  return pressing;
}

export interface Tap {
  at: Point;
  down: number;
  up: number;
}

export interface TapOptions extends PressOptions {
  /** Where the lifted finger waits during a gap of over 1.2 s between taps, clear of the keys. */
  park?: Point;
}

/**
 * Presses each tap's target in turn, gliding to the next one while lifted, and
 * from the last back to the first across the loop. `taps` must be in time order
 * within [0, loop). Returns the index of the tap being pressed at `t`, or -1.
 */
export function tapFinger(view: DecorView, key: string, t: number, taps: Tap[], loop: number, opts: TapOptions = {}): number {
  const presses = taps.flatMap(({ down, up }): [number, number][] => [
    [down - loop, up - loop],
    [down, up],
    [down + loop, up + loop],
  ]);
  pressFinger(view, key, t, glideAt(t, taps, loop, opts.park), presses, opts);
  return taps.findIndex(({ down, up }) => t >= down && t < up);
}

function glideAt(t: number, taps: Tap[], loop: number, park?: Point): Point {
  const n = taps.length;
  const tau = t < taps[0].down ? t + loop : t;
  for (let i = 0; i < n; i++) {
    const here = taps[i];
    const next = taps[(i + 1) % n];
    const nextDown = next.down + (i === n - 1 ? loop : 0);
    if (tau < here.down || tau >= nextDown) continue;
    // The glide fills the time the finger is fully lifted.
    const start = here.up + MOVE;
    const end = nextDown - MOVE;
    if (park && end - start > 1200) {
      const GLIDE = 400;
      if (tau < start + GLIDE) return glide(here.at, park, easeInOutCubic(clamp((tau - start) / GLIDE)));
      if (tau < end - GLIDE) return park;
      return glide(park, next.at, easeInOutCubic(clamp((tau - (end - GLIDE)) / GLIDE)));
    }
    const k = end > start ? easeInOutCubic(clamp((tau - start) / (end - start))) : Number(tau >= (here.up + nextDown) / 2);
    return { x: lerp(here.at.x, next.at.x, k), y: lerp(here.at.y, next.at.y, k) };
  }
  throw new Error(`tapFinger: no tap spans t=${t}`);
}

const glide = (a: Point, b: Point, k: number): Point => ({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k) });

const cap = (x: number, y: number, w: number, h: number) =>
  `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;border-radius:3px;background:#cfd6df;border:1.2px solid ${MUTED};box-sizing:border-box"></div>`;

const KEY = 42;
const GRID_Y = 74;
const keyGrid = [0, 1, 2]
  .flatMap((row) =>
    [0, 1, 2].map(
      (col) =>
        `<div style="position:absolute;left:${14 + col * (KEY + 6)}px;top:${GRID_Y + row * (KEY + 6)}px;width:${KEY}px;height:${KEY}px;border-radius:4px;background:#f1f3f5;border:1.2px solid ${MUTED};box-sizing:border-box;font:600 16px/40px Inter, sans-serif;text-align:center;color:#334155">${row * 3 + col + 1}</div>`,
    ),
  )
  .join('');
const keyTap = (n: number) => ({
  x: 14 + ((n - 1) % 3) * (KEY + 6) + KEY / 2 + KEYPAD.aim.x,
  y: GRID_Y + Math.floor((n - 1) / 3) * (KEY + 6) + KEY / 2 + KEYPAD.aim.y,
});

const turned = (rotate: number, w: number, h: number, capBox: [number, number, number, number], at: Point): DecorSample => ({
  name: `finger: rotate ${rotate}`,
  w,
  h,
  html: `${cap(...capBox)}${finger(`r${rotate}`, { rotate, length: 64 })}`,
  duration: 1200,
  play: (view, t) => {
    pressFinger(view, `r${rotate}`, t, at, [[400, 800]]);
  },
});

export const samples: DecorSample[] = [
  {
    name: 'finger: press',
    w: 80,
    h: 140,
    html: `${cap(24, 118, 32, 10)}${finger('s')}`,
    duration: 1200,
    play: (view, t) => {
      pressFinger(view, 's', t, { x: 40, y: 118 }, [[400, 800]]);
    },
  },
  turned(90, 120, 60, [10, 14, 10, 32], { x: 20, y: 30 }),
  turned(180, 60, 120, [14, 10, 32, 10], { x: 30, y: 20 }),
  turned(270, 120, 60, [100, 14, 10, 32], { x: 100, y: 30 }),
  {
    name: 'finger: keypad tap, tilted',
    w: 200,
    h: 226,
    html: `${keyGrid}${finger('k', { length: 84, rotate: KEYPAD.rotate })}`,
    duration: 2400,
    play: (view, t) => {
      tapFinger(
        view,
        'k',
        t,
        [
          { at: keyTap(1), down: 300, up: 600 },
          { at: keyTap(5), down: 1000, up: 1300 },
          { at: keyTap(9), down: 1700, up: 2000 },
        ],
        2400,
      );
    },
  },
  {
    name: 'finger: keypad tap, parked during a long wait',
    w: 200,
    h: 226,
    html: `${keyGrid}${finger('p', { length: 84, rotate: KEYPAD.rotate })}`,
    duration: 3600,
    play: (view, t) => {
      tapFinger(
        view,
        'p',
        t,
        [
          { at: keyTap(1), down: 300, up: 600 },
          { at: keyTap(5), down: 900, up: 1200 },
        ],
        3600,
        { park: { x: 180, y: 40 } },
      );
    },
  },
  {
    name: 'finger: glide between pads',
    w: 180,
    h: 150,
    html: `${cap(16, 126, 32, 10)}${cap(74, 126, 32, 10)}${cap(132, 126, 32, 10)}${finger('g')}`,
    duration: 2700,
    play: (view, t) => {
      tapFinger(
        view,
        'g',
        t,
        [32, 90, 148].map((x, i) => ({ at: { x, y: 126 }, down: 300 + i * 900, up: 650 + i * 900 })),
        2700,
      );
    },
  },
];

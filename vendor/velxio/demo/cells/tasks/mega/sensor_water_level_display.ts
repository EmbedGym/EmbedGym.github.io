import { easeInOutCubic, lerp, progress } from '../../anim';
import type { Cell } from '../../cell';
import { setWater, waterGlass } from '../../decor/water';

type Lcd = HTMLElement & { text: string };

// The water in the glass drains, refills and settles back; the sketch reads A2
// every 100 ms and redraws a centred bar of '#' on the bottom row.
export const DURATION = 6000;
export const KEYS: [number, number][] = [
  [0, 528],
  [700, 528],
  [1500, 144],
  [2500, 144],
  [3400, 900],
  [4500, 900],
  [5300, 528],
];
/** The reading at `t` along `keys` ([ms, reading] pairs, eased between). */
export function readingOn(keys: [number, number][], t: number) {
  for (let i = keys.length - 1; i >= 0; i--) {
    const [t0, v0] = keys[i];
    if (t < t0) continue;
    const next = keys[i + 1];
    if (!next) return v0;
    return lerp(v0, next[1], easeInOutCubic(progress(t, t0, next[0] - t0)));
  }
  throw new Error(`no reading at ${t}`);
}
const readingAt = (t: number) => readingOn(KEYS, t);

export function barRow(level: number) {
  const bars = Math.floor((level * 16) / 1023);
  const left = Math.floor((16 - bars) / 2);
  return Array.from({ length: 16 }, (_, i) => (i >= left && i < left + bars ? '#' : ' ')).join('');
}

// Cell coordinates: the probe's sense traces span y 83..145; the glass hangs round its lower half.
export const GLASS = { x: 405, y: 68, scale: 70 / 52 };
const GLASS_H = 70 * GLASS.scale;
const TRACE_TOP = 83;
const TRACE_END = 147;
const waterTop = (level: number) => TRACE_END - (level / 1023) * (TRACE_END - TRACE_TOP);
const BADGE = { x: 498, y: 84, w: 128, h: 62 };

const waterLevelDisplay: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-wl-badge {
          position: absolute; left: ${BADGE.x}px; top: ${BADGE.y}px; width: ${BADGE.w}px; height: ${BADGE.h}px;
          box-sizing: border-box; display: flex; align-items: center; justify-content: center; gap: 10px;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
          font: 600 28px var(--mono); color: var(--ink);
        }
        .c-wl-pin { color: var(--muted); }
        .c-wl-val { color: #00aaaa; }
      </style>
      ${waterGlass('g', GLASS.x, GLASS.y, { kind: 'tall', scale: GLASS.scale })}
      <div class="c-wl-badge"><span class="c-wl-pin">A2</span><span class="c-wl-val"></span></div>`,
    bounds: [GLASS.x - 2, GLASS.y - 2, BADGE.x + BADGE.w, GLASS.y + GLASS_H + 2],
  },
  run(t, view) {
    const level = readingAt(t);
    setWater(view, 'g', (GLASS.y + GLASS_H - waterTop(level)) / GLASS_H);
    view.q<HTMLElement>('.c-wl-val').textContent = String(Math.round(level));
    view.glowWire('w-A2-signal', level / 1023);

    const polled = readingAt(Math.floor(t / 100) * 100);
    view.part<Lcd>('LCD1').text = `Water Level     ${barRow(polled)}`;
  },
  activity: [
    {
      wires: ['w-12-RS', 'w-11-E', 'w-4-D4', 'w-5-D5', 'w-6-D6', 'w-7-D7'],
      at: Array.from({ length: DURATION / 100 }, (_, i) => i * 100).filter((ms) => barRow(readingAt(ms)) !== barRow(readingAt((ms + DURATION - 100) % DURATION))),
    },
  ],
};

export default waterLevelDisplay;

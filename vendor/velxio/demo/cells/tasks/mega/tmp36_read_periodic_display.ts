import { easeInOutCubic, lerp, progress } from '../../anim';
import type { Cell } from '../../cell';
import { finger, pressFinger } from '../../decor/finger';

type Lcd = HTMLElement & { text: string };
type Button = HTMLElement & { pressed: boolean };

// A press clears the LCD and restarts the count, then every second the sketch reads the
// TMP36 and scrolls a numbered line up. The room warms after reading #2 and cools again
// after #4, just before the next press, which the loop starts on.
export const DURATION = 4800;
const COOL = 28.3;
const WARM = 31.2;
const WARMING: [number, number] = [2200, 2800];
const COOLING: [number, number] = [4150, 4650];
export const PRESSES: [number, number][] = [
  [0, 250],
  [DURATION, DURATION + 250],
];
export const SAMPLES = [1000, 2000, 3000, 4000];

export function airAt(t: number) {
  const warm = progress(t, WARMING[0], WARMING[1] - WARMING[0]) - progress(t, COOLING[0], COOLING[1] - COOLING[0]);
  const k = easeInOutCubic(warm);
  return { c: lerp(COOL, WARM, k), k };
}

const fahrenheit = (c: number) => Math.round(c * 1.8 + 32);
export const line = (n: number) => (n > 0 ? `Temp #${n}: ${fahrenheit(airAt(SAMPLES[n - 1]).c)} F` : '');

// Cell coordinates: the TMP36 hangs below A0 at x 178..238, y 213..289.
const BADGE = { x: 252, y: 214, w: 170, h: 68 };

const tmp36PeriodicDisplay: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-tpd-air {
          position: absolute; left: ${BADGE.x}px; top: ${BADGE.y}px; width: ${BADGE.w}px; height: ${BADGE.h}px;
          box-sizing: border-box; display: flex; align-items: center; justify-content: center;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
          font: 600 34px var(--mono);
          color: color-mix(in srgb, #e8590c calc(100% * var(--k, 0)), #1c7ed6);
        }
      </style>
      <div class="c-tpd-air"></div>
      ${finger('f')}`,
    bounds: [BADGE.x, BADGE.y, BADGE.x + BADGE.w, BADGE.y + BADGE.h],
  },
  run(t, view) {
    const air = airAt(t);
    const badge = view.q<HTMLElement>('.c-tpd-air');
    badge.style.setProperty('--k', String(air.k));
    badge.textContent = `${air.c.toFixed(1)}°C`;

    const btn = view.box('BTN');
    const pressing = pressFinger(view, 'f', t, { x: btn.x + btn.w / 2, y: btn.y + btn.h / 2 + 4 }, PRESSES);
    view.part<Button>('BTN').pressed = pressing;
    if (pressing) {
      view.glowWire('w-2-BTN', 1);
      view.glowWire('w-2-RPD', 1);
    }

    const n = SAMPLES.filter((s) => s <= t).length;
    view.part<Lcd>('LCD1').text = line(n - 1).padEnd(16, ' ') + line(n).padEnd(16, ' ');
  },
  activity: [
    { wires: ['w-A0-Vout'], at: SAMPLES.map((s) => s - 2) },
    { wires: ['w-12-RS', 'w-11-E', 'w-4-D4', 'w-5-D5', 'w-6-D6', 'w-7-D7'], at: [2, ...SAMPLES] },
  ],
};

export default tmp36PeriodicDisplay;

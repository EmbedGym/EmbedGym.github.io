import { easeInOutCubic, lerp, progress } from '../../anim';
import type { Cell } from '../../cell';
import { finger, pressFinger } from '../../decor/finger';

type Lcd = HTMLElement & { text: string };
type Button = HTMLElement & { pressed: boolean };

// The room cools, a press reads the TMP36 onto the LCD in Fahrenheit; it warms
// again and the LCD keeps the old reading until the second press, which the loop starts on.
export const DURATION = 5600;
export const COOL = 28.3;
export const WARM = 31.2;
const COOLING: [number, number] = [300, 1200];
const WARMING: [number, number] = [2600, 3500];
export const PRESSES: [number, number][] = [
  [1800, 2050],
  [4200, 4450],
];
export const SHOWN = PRESSES.map(([down]) => down + 5);

export function airAt(t: number) {
  const warm = 1 - progress(t, COOLING[0], COOLING[1] - COOLING[0]) + progress(t, WARMING[0], WARMING[1] - WARMING[0]);
  const k = easeInOutCubic(warm);
  return { c: lerp(COOL, WARM, k), k };
}

const fahrenheit = (c: number) => Math.round(c * 1.8 + 32);
export const screen = (c: number) => `Temp: ${fahrenheit(c)} F`.padEnd(32, ' ');

// Cell coordinates: the TMP36 hangs below A0 at x 178..238, y 210..286.
const BADGE = { x: 252, y: 214, w: 170, h: 68 };

const tmp36ButtonDisplay: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-tbd-air {
          position: absolute; left: ${BADGE.x}px; top: ${BADGE.y}px; width: ${BADGE.w}px; height: ${BADGE.h}px;
          box-sizing: border-box; display: flex; align-items: center; justify-content: center;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
          font: 600 34px var(--mono);
          color: color-mix(in srgb, #e8590c calc(100% * var(--k, 0)), #1c7ed6);
        }
      </style>
      <div class="c-tbd-air"></div>
      ${finger('f')}`,
    bounds: [BADGE.x, BADGE.y, BADGE.x + BADGE.w, BADGE.y + BADGE.h],
  },
  run(t, view) {
    const air = airAt(t);
    const badge = view.q<HTMLElement>('.c-tbd-air');
    badge.style.setProperty('--k', String(air.k));
    badge.textContent = `${air.c.toFixed(1)}°C`;

    const btn = view.box('BTN');
    const pressing = pressFinger(view, 'f', t, { x: btn.x + btn.w / 2, y: btn.y + btn.h / 2 + 4 }, PRESSES);
    view.part<Button>('BTN').pressed = pressing;
    if (pressing) {
      view.glowWire('w-2-BTN', 1);
      view.glowWire('w-2-RPD', 1);
    }

    const lastShown = SHOWN.filter((s) => s <= t).length;
    view.part<Lcd>('LCD1').text = screen(lastShown === 1 ? COOL : WARM);
  },
  activity: [
    { wires: ['w-A0-Vout'], at: SHOWN.map((s) => s - 4) },
    { wires: ['w-12-RS', 'w-11-E', 'w-4-D4', 'w-5-D5', 'w-6-D6', 'w-7-D7'], at: SHOWN.map((s) => s - 2) },
  ],
};

export default tmp36ButtonDisplay;

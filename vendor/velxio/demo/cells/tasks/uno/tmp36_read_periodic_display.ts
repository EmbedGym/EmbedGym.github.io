import type { Cell } from '../../cell';
import { finger, pressFinger } from '../../decor/finger';
import { DURATION, PRESSES, SAMPLES, airAt, line } from '../mega/tmp36_read_periodic_display';

// | board   | arduino-uno                      |
// | LCD bus | w-12-RS, w-11-E, w-4-D4 … w-7-D7 |
// | button  | w-2-BTN, w-2-RPD (D2)            |
// | TMP36   | w-A0-Vout (A0)                   |

type Lcd = HTMLElement & { text: string };
type Button = HTMLElement & { pressed: boolean };

const LCD_BUS = ['w-12-RS', 'w-11-E', 'w-4-D4', 'w-5-D5', 'w-6-D6', 'w-7-D7'];
// Cell coordinates: the TMP36 hangs below A0 at x 178..238, y 240..316; its badge sits
// right of it. LCD1 is turned 270° left of the board, so its rows are repeated upright
// right of the button.
const BADGE = { x: 262, y: 240, w: 190, h: 76 };
const READ = { x: 420, y: 90, w: 360, h: 114 };

// The Mega loop starts on the press; here it starts 1.2 s before it, so the press and the
// cleared LCD play mid-loop and the seam falls while reading #3 is on screen.
const SHIFT = 1200;
const local = (t: number) => (t - SHIFT + DURATION) % DURATION;

const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-tpu-air {
          position: absolute; left: ${BADGE.x}px; top: ${BADGE.y}px; width: ${BADGE.w}px; height: ${BADGE.h}px;
          box-sizing: border-box; display: flex; align-items: center; justify-content: center;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
          font: 600 42px var(--mono);
          color: color-mix(in srgb, #e8590c calc(100% * var(--k, 0)), #1c7ed6);
        }
        .c-tpu-read { position: absolute; left: ${READ.x}px; top: ${READ.y}px; width: ${READ.w}px; height: ${READ.h}px; box-sizing: border-box;
          padding: 6px 9px; border-radius: 4px; background: #6cb201; border: 3px solid #1f2937;
          font: 600 42px/48px ui-monospace, Menlo, monospace; color: #000; white-space: pre; overflow: hidden; }
      </style>
      <div class="c-tpu-air"></div>
      <div class="c-tpu-read"></div>
      ${finger('f', { length: 48 })}`,
    bounds: [Math.min(BADGE.x, READ.x), Math.min(BADGE.y, READ.y), Math.max(BADGE.x + BADGE.w, READ.x + READ.w), Math.max(BADGE.y + BADGE.h, READ.y + READ.h)],
  },
  run(t0, view) {
    const t = local(t0);
    const air = airAt(t);
    const badge = view.q<HTMLElement>('.c-tpu-air');
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
    const text = line(n - 1).padEnd(16, ' ') + line(n).padEnd(16, ' ');
    view.part<Lcd>('LCD1').text = text;
    view.q<HTMLElement>('.c-tpu-read').textContent = `${text.slice(0, 16).trimEnd()}\n${text.slice(16).trimEnd()}`;
  },
  activity: [
    { wires: ['w-A0-Vout'], at: SAMPLES.map((s) => (s - 2 + SHIFT) % DURATION) },
    { wires: LCD_BUS, at: [2, ...SAMPLES].map((s) => (s + SHIFT) % DURATION) },
  ],
};

export default cell;

import type { Cell } from '../../cell';
import { finger, pressFinger } from '../../decor/finger';
import { DURATION, PRESSES, SAMPLES, airAt, line } from '../mega/tmp36_read_periodic_display';

// | board   | esp32-s3                                    |
// | LCD bus | w-38-RS, w-39-E, w-40-D4 … w-42-D6, w-21-D7 |
// | button  | w-12-BTN, w-12-RPD (GPIO12)                 |
// | TMP36   | w-9-Vout (GPIO9)                            |

type Lcd = HTMLElement & { text: string };
type Button = HTMLElement & { pressed: boolean };

const LCD_BUS = ['w-38-RS', 'w-39-E', 'w-40-D4', 'w-41-D5', 'w-42-D6', 'w-21-D7'];
// Cell coordinates: the TMP36 spans x -210..-150, y 130..206 left of the board; its 3V3
// lead loops round it at x -230, so the badge sits left of that.
const BADGE = { x: -430, y: 140, w: 190, h: 76 };

// The Mega loop starts on the press; here it starts 1.2 s before it, so the press and the
// cleared LCD play mid-loop and the seam falls while reading #3 is on screen.
const SHIFT = 1200;
const local = (t: number) => (t - SHIFT + DURATION) % DURATION;

const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-tpe-air {
          position: absolute; left: ${BADGE.x}px; top: ${BADGE.y}px; width: ${BADGE.w}px; height: ${BADGE.h}px;
          box-sizing: border-box; display: flex; align-items: center; justify-content: center;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
          font: 600 36px var(--mono);
          color: color-mix(in srgb, #e8590c calc(100% * var(--k, 0)), #1c7ed6);
        }
      </style>
      <div class="c-tpe-air"></div>
      ${finger('f', { length: 48 })}`,
    bounds: [BADGE.x, BADGE.y, BADGE.x + BADGE.w, BADGE.y + BADGE.h],
  },
  run(t0, view) {
    const t = local(t0);
    const air = airAt(t);
    const badge = view.q<HTMLElement>('.c-tpe-air');
    badge.style.setProperty('--k', String(air.k));
    badge.textContent = `${air.c.toFixed(1)}°C`;

    const btn = view.box('BTN');
    const pressing = pressFinger(view, 'f', t, { x: btn.x + btn.w / 2, y: btn.y + btn.h / 2 + 4 }, PRESSES);
    view.part<Button>('BTN').pressed = pressing;
    if (pressing) {
      view.glowWire('w-12-BTN', 1);
      view.glowWire('w-12-RPD', 1);
    }

    const n = SAMPLES.filter((s) => s <= t).length;
    const text = line(n - 1).padEnd(16, ' ') + line(n).padEnd(16, ' ');
    view.part<Lcd>('LCD1').text = text;
  },
  activity: [
    { wires: ['w-9-Vout'], at: SAMPLES.map((s) => (s - 2 + SHIFT) % DURATION) },
    { wires: LCD_BUS, at: [2, ...SAMPLES].map((s) => (s + SHIFT) % DURATION) },
  ],
};

export default cell;

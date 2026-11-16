import type { Cell } from '../../cell';
import { finger, pressFinger } from '../../decor/finger';
import { DURATION, PRESSES, SAMPLES, airAt, line } from '../mega/tmp36_read_periodic_display';

// | board   | nrf52840-dk                                        |
// | LCD bus | w-P0.04-RS, w-P0.05-E, w-P0.02-D4, w-P0.31-D5 … D7 |
// | button  | w-P1.11-BTN, w-P1.11-RPD (P1.11)                   |
// | TMP36   | w-P0.03-Vout (P0.03)                               |

type Lcd = HTMLElement & { text: string };
type Button = HTMLElement & { pressed: boolean };

const LCD_BUS = ['w-P0.04-RS', 'w-P0.05-E', 'w-P0.02-D4', 'w-P0.31-D5', 'w-P0.29-D6', 'w-P0.30-D7'];
// Cell coordinates: the TMP36 hangs under the DK's bottom header at x 60..120, y 300..376;
// its badge sits left of it. LCD1 is turned 90°, so its rows are repeated upright in the
// strip under the DK.
const BADGE = { x: -140, y: 300, w: 190, h: 76 };
// The finger hovers up to y -60 over the button.
const FINGER_TOP = -60;
const READ = { x: 230, y: 310, w: 320, h: 98 };

// The Mega loop starts on the press; here it starts 1.2 s before it, so the press and the
// cleared LCD play mid-loop and the seam falls while reading #3 is on screen.
const SHIFT = 1200;
const local = (t: number) => (t - SHIFT + DURATION) % DURATION;

const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-tpn-air {
          position: absolute; left: ${BADGE.x}px; top: ${BADGE.y}px; width: ${BADGE.w}px; height: ${BADGE.h}px;
          box-sizing: border-box; display: flex; align-items: center; justify-content: center;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
          font: 600 36px var(--mono);
          color: color-mix(in srgb, #e8590c calc(100% * var(--k, 0)), #1c7ed6);
        }
        .c-tpn-read { position: absolute; left: ${READ.x}px; top: ${READ.y}px; width: ${READ.w}px; height: ${READ.h}px; box-sizing: border-box;
          padding: 6px 9px; border-radius: 4px; background: #6cb201; border: 3px solid #1f2937;
          font: 600 36px/41px ui-monospace, Menlo, monospace; color: #000; white-space: pre; overflow: hidden; }
      </style>
      <div class="c-tpn-air"></div>
      <div class="c-tpn-read"></div>
      ${finger('f', { length: 48 })}`,
    bounds: [Math.min(BADGE.x, READ.x), FINGER_TOP, Math.max(BADGE.x + BADGE.w, READ.x + READ.w), Math.max(BADGE.y + BADGE.h, READ.y + READ.h)],
  },
  run(t0, view) {
    const t = local(t0);
    const air = airAt(t);
    const badge = view.q<HTMLElement>('.c-tpn-air');
    badge.style.setProperty('--k', String(air.k));
    badge.textContent = `${air.c.toFixed(1)}°C`;

    const btn = view.box('BTN');
    const pressing = pressFinger(view, 'f', t, { x: btn.x + btn.w / 2, y: btn.y + btn.h / 2 + 4 }, PRESSES);
    view.part<Button>('BTN').pressed = pressing;
    if (pressing) {
      view.glowWire('w-P1.11-BTN', 1);
      view.glowWire('w-P1.11-RPD', 1);
    }

    const n = SAMPLES.filter((s) => s <= t).length;
    const text = line(n - 1).padEnd(16, ' ') + line(n).padEnd(16, ' ');
    view.part<Lcd>('LCD1').text = text;
    view.q<HTMLElement>('.c-tpn-read').textContent = `${text.slice(0, 16).trimEnd()}\n${text.slice(16).trimEnd()}`;
  },
  activity: [
    { wires: ['w-P0.03-Vout'], at: SAMPLES.map((s) => (s - 2 + SHIFT) % DURATION) },
    { wires: LCD_BUS, at: [2, ...SAMPLES].map((s) => (s + SHIFT) % DURATION) },
  ],
};

export default cell;

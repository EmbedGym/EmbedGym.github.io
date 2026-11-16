import type { Cell } from '../../cell';
import { finger, pressFinger } from '../../decor/finger';
import { COOL, DURATION, PRESSES, SHOWN, WARM, airAt, screen } from '../mega/tmp36_read_button_display';

// | board   | nrf52840-dk                                        |
// | LCD bus | w-P0.04-RS, w-P0.05-E, w-P0.02-D4, w-P0.31-D5 … D7 |
// | button  | w-P1.11-BTN, w-P1.11-RPD (P1.11)                   |
// | TMP36   | w-P0.03-Vout (P0.03)                               |

type Lcd = HTMLElement & { text: string };
type Button = HTMLElement & { pressed: boolean };

const LCD_BUS = ['w-P0.04-RS', 'w-P0.05-E', 'w-P0.02-D4', 'w-P0.31-D5', 'w-P0.29-D6', 'w-P0.30-D7'];
// Cell coordinates: the TMP36 spans x -126..-50, y 278..338 left of the DK's bottom
// corner; its badge sits under it. LCD1 is turned 90°, so its rows are repeated upright
// in the strip under the DK.
const BADGE = { x: -150, y: 352, w: 190, h: 76 };
// The finger hovers up to y -60 over the button.
const FINGER_TOP = -60;
const READ = { x: 230, y: 310, w: 320, h: 98 };

const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-tbn-air {
          position: absolute; left: ${BADGE.x}px; top: ${BADGE.y}px; width: ${BADGE.w}px; height: ${BADGE.h}px;
          box-sizing: border-box; display: flex; align-items: center; justify-content: center;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
          font: 600 36px var(--mono);
          color: color-mix(in srgb, #e8590c calc(100% * var(--k, 0)), #1c7ed6);
        }
        .c-tbn-read { position: absolute; left: ${READ.x}px; top: ${READ.y}px; width: ${READ.w}px; height: ${READ.h}px; box-sizing: border-box;
          padding: 6px 9px; border-radius: 4px; background: #6cb201; border: 3px solid #1f2937;
          font: 600 36px/41px ui-monospace, Menlo, monospace; color: #000; white-space: pre; overflow: hidden; }
      </style>
      <div class="c-tbn-air"></div>
      <div class="c-tbn-read"></div>
      ${finger('f', { length: 48 })}`,
    bounds: [Math.min(BADGE.x, READ.x), FINGER_TOP, Math.max(BADGE.x + BADGE.w, READ.x + READ.w), Math.max(BADGE.y + BADGE.h, READ.y + READ.h)],
  },
  run(t, view) {
    const air = airAt(t);
    const badge = view.q<HTMLElement>('.c-tbn-air');
    badge.style.setProperty('--k', String(air.k));
    badge.textContent = `${air.c.toFixed(1)}°C`;

    const btn = view.box('BTN');
    const pressing = pressFinger(view, 'f', t, { x: btn.x + btn.w / 2, y: btn.y + btn.h / 2 + 4 }, PRESSES);
    view.part<Button>('BTN').pressed = pressing;
    if (pressing) {
      view.glowWire('w-P1.11-BTN', 1);
      view.glowWire('w-P1.11-RPD', 1);
    }

    const text = screen(SHOWN.filter((s) => s <= t).length === 1 ? COOL : WARM);
    view.part<Lcd>('LCD1').text = text;
    view.q<HTMLElement>('.c-tbn-read').textContent = `${text.slice(0, 16).trimEnd()}\n${text.slice(16).trimEnd()}`;
  },
  activity: [
    { wires: ['w-P0.03-Vout'], at: SHOWN.map((s) => s - 4) },
    { wires: LCD_BUS, at: SHOWN.map((s) => s - 2) },
  ],
};

export default cell;

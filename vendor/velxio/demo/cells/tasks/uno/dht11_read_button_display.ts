import type { Cell } from '../../cell';
import { finger, pressFinger } from '../../decor/finger';
import { COOL, DURATION, PRESSES, SHOWN, WARM, airAt, screen } from '../mega/dht11_read_button_display';

// | board    | arduino-uno                        |
// | LCD bus  | w-12-RS, w-11-E, w-4-D4 … w-7-D7   |
// | button   | w-2-BTN, w-2-RPD (D2 interrupt)    |
// | DHT11    | w-3-DATA                           |

type Lcd = HTMLElement & { text: string };
type Button = HTMLElement & { pressed: boolean };

// Cell coordinates: LCD1 is turned 270° left of the board, so its rows are repeated
// upright above the board; the badge sits right of the DHT11 (x 420..480, y 40..124).
const READ = { x: 0, y: -245, w: 356, h: 98 };
const BADGE = { x: 504, y: 40, w: 156, h: 92 };

const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-dhtu-air {
          position: absolute; left: ${BADGE.x}px; top: ${BADGE.y}px; width: ${BADGE.w}px; height: ${BADGE.h}px;
          box-sizing: border-box; padding: 6px 14px; display: flex; flex-direction: column; justify-content: center;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
          font: 600 34px/1.15 var(--mono);
        }
        .c-dhtu-air span { color: color-mix(in srgb, #e8590c calc(100% * var(--k, 0)), #1c7ed6); }
        .c-dhtu-read { position: absolute; left: ${READ.x}px; top: ${READ.y}px; width: ${READ.w}px; height: ${READ.h}px; box-sizing: border-box;
          padding: 6px 9px; border-radius: 4px; background: #6cb201; border: 3px solid #1f2937;
          font: 600 34px/40px ui-monospace, Menlo, monospace; color: #000; white-space: pre; overflow: hidden; }
      </style>
      <div class="c-dhtu-air"><span class="c-dhtu-t"></span><span class="c-dhtu-h"></span></div>
      <div class="c-dhtu-read"></div>
      ${finger('f', { length: 48 })}`,
    bounds: [READ.x, READ.y, BADGE.x + BADGE.w, BADGE.y + BADGE.h],
  },
  run(t, view) {
    const air = airAt(t);
    view.q<HTMLElement>('.c-dhtu-air').style.setProperty('--k', String(air.k));
    view.q<HTMLElement>('.c-dhtu-t').textContent = `${air.t.toFixed(0)}°C`;
    view.q<HTMLElement>('.c-dhtu-h').textContent = `${air.h.toFixed(0)}% RH`;

    const btn = view.box('BTN');
    const pressing = pressFinger(view, 'f', t, { x: btn.x + btn.w / 2, y: btn.y + btn.h / 2 + 4 }, PRESSES);
    view.part<Button>('BTN').pressed = pressing;
    if (pressing) {
      view.glowWire('w-2-BTN', 1);
      view.glowWire('w-2-RPD', 1);
    }

    const text = screen(SHOWN.filter((s) => s <= t).length === 1 ? WARM : COOL);
    view.part<Lcd>('LCD1').text = text;
    view.q<HTMLElement>('.c-dhtu-read').textContent = `${text.slice(0, 16)}\n${text.slice(16)}`;
  },
  activity: [
    { wires: ['w-3-DATA'], at: PRESSES.map(([down]) => down + 5) },
    { wires: ['w-12-RS', 'w-11-E', 'w-4-D4', 'w-5-D5', 'w-6-D6', 'w-7-D7'], at: SHOWN.map((s) => s - 3) },
  ],
};

export default cell;

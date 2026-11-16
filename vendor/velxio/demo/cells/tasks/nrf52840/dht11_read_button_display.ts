import type { Cell } from '../../cell';
import { finger, pressFinger } from '../../decor/finger';
import { COOL, DURATION, PRESSES, SHOWN, WARM, airAt, screen } from '../mega/dht11_read_button_display';

// | board    | nrf52840-dk                                          |
// | LCD bus  | w-P0.04-RS, w-P0.05-E, w-P0.02-D4, w-P0.31-D5 … D7   |
// | button   | w-P1.11-BTN, w-P1.11-RPD (P1.11 interrupt)           |
// | DHT11    | w-P1.02-DATA (H1)                                    |

type Lcd = HTMLElement & { text: string };
type Button = HTMLElement & { pressed: boolean };

const LCD_BUS = ['w-P0.04-RS', 'w-P0.05-E', 'w-P0.02-D4', 'w-P0.31-D5', 'w-P0.29-D6', 'w-P0.30-D7'];
// Cell coordinates: H1 spans x -126..-42, y -26..34 left of the DK's top corner; the badge
// sits in the free space under it. LCD1 is turned 90°, so its rows are repeated upright above it.
const BADGE = { x: -210, y: 80, w: 176, h: 104 };
const READ = { x: 580, y: -24, w: 266, h: 98 };

const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-dhtn-air {
          position: absolute; left: ${BADGE.x}px; top: ${BADGE.y}px; width: ${BADGE.w}px; height: ${BADGE.h}px;
          box-sizing: border-box; padding: 6px 14px; display: flex; flex-direction: column; justify-content: center;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
          font: 600 36px/1.15 var(--mono);
        }
        .c-dhtn-air span { color: color-mix(in srgb, #e8590c calc(100% * var(--k, 0)), #1c7ed6); }
        .c-dhtn-read { position: absolute; left: ${READ.x}px; top: ${READ.y}px; width: ${READ.w}px; height: ${READ.h}px; box-sizing: border-box;
          padding: 6px 9px; border-radius: 4px; background: #6cb201; border: 3px solid #1f2937;
          font: 600 36px/41px ui-monospace, Menlo, monospace; color: #000; white-space: pre; overflow: hidden; }
      </style>
      <div class="c-dhtn-air"><span class="c-dhtn-t"></span><span class="c-dhtn-h"></span></div>
      <div class="c-dhtn-read"></div>
      ${finger('f', { length: 48 })}`,
    bounds: [BADGE.x, READ.y, READ.x + READ.w, BADGE.y + BADGE.h],
  },
  run(t, view) {
    const air = airAt(t);
    view.q<HTMLElement>('.c-dhtn-air').style.setProperty('--k', String(air.k));
    view.q<HTMLElement>('.c-dhtn-t').textContent = `${air.t.toFixed(0)}°C`;
    view.q<HTMLElement>('.c-dhtn-h').textContent = `${air.h.toFixed(0)}% RH`;

    const btn = view.box('BTN');
    const pressing = pressFinger(view, 'f', t, { x: btn.x + btn.w / 2, y: btn.y + btn.h / 2 + 4 }, PRESSES);
    view.part<Button>('BTN').pressed = pressing;
    if (pressing) {
      view.glowWire('w-P1.11-BTN', 1);
      view.glowWire('w-P1.11-RPD', 1);
    }

    const text = screen(SHOWN.filter((s) => s <= t).length === 1 ? WARM : COOL);
    view.part<Lcd>('LCD1').text = text;
    view.q<HTMLElement>('.c-dhtn-read').textContent = `${text.slice(0, 16).trimEnd()}\n${text.slice(16).trimEnd()}`;
  },
  activity: [
    { wires: ['w-P1.02-DATA'], at: PRESSES.map(([down]) => down + 5) },
    { wires: LCD_BUS, at: SHOWN.map((s) => s - 3) },
  ],
};

export default cell;

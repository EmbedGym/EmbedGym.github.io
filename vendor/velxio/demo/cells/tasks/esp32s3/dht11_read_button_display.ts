import type { Cell } from '../../cell';
import { finger, pressFinger } from '../../decor/finger';
import { COOL, DURATION, PRESSES, SHOWN, WARM, airAt, screen } from '../mega/dht11_read_button_display';

// | board    | esp32-s3                                     |
// | LCD bus  | w-38-RS, w-39-E, w-40-D4 … w-42-D6, w-21-D7  |
// | button   | w-12-BTN, w-12-RPD (GPIO12 interrupt)        |
// | DHT11    | w-14-DATA                                    |

type Lcd = HTMLElement & { text: string };
type Button = HTMLElement & { pressed: boolean };

// Cell coordinates: the DHT11 spans x -210..-150, y 136..220; the badge sits left of its VCC lead.
const BADGE = { x: -400, y: 132, w: 176, h: 104 };

const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-dhte-air {
          position: absolute; left: ${BADGE.x}px; top: ${BADGE.y}px; width: ${BADGE.w}px; height: ${BADGE.h}px;
          box-sizing: border-box; padding: 6px 14px; display: flex; flex-direction: column; justify-content: center;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
          font: 600 38px/1.15 var(--mono);
        }
        .c-dhte-air span { color: color-mix(in srgb, #e8590c calc(100% * var(--k, 0)), #1c7ed6); }
      </style>
      <div class="c-dhte-air"><span class="c-dhte-t"></span><span class="c-dhte-h"></span></div>
      ${finger('f', { length: 64 })}`,
    bounds: [BADGE.x, BADGE.y, BADGE.x + BADGE.w, BADGE.y + BADGE.h],
  },
  run(t, view) {
    const air = airAt(t);
    view.q<HTMLElement>('.c-dhte-air').style.setProperty('--k', String(air.k));
    view.q<HTMLElement>('.c-dhte-t').textContent = `${air.t.toFixed(0)}°C`;
    view.q<HTMLElement>('.c-dhte-h').textContent = `${air.h.toFixed(0)}% RH`;

    const btn = view.box('BTN');
    const pressing = pressFinger(view, 'f', t, { x: btn.x + btn.w / 2, y: btn.y + btn.h / 2 + 4 }, PRESSES);
    view.part<Button>('BTN').pressed = pressing;
    if (pressing) {
      view.glowWire('w-12-BTN', 1);
      view.glowWire('w-12-RPD', 1);
    }

    view.part<Lcd>('LCD1').text = screen(SHOWN.filter((s) => s <= t).length === 1 ? WARM : COOL);
  },
  activity: [
    { wires: ['w-14-DATA'], at: PRESSES.map(([down]) => down + 5) },
    { wires: ['w-38-RS', 'w-39-E', 'w-40-D4', 'w-41-D5', 'w-42-D6', 'w-21-D7'], at: SHOWN.map((s) => s - 3) },
  ],
};

export default cell;

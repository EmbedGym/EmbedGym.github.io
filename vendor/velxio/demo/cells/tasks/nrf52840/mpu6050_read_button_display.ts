import type { Cell } from '../../cell';
import { finger, pressFinger } from '../../decor/finger';
import { A, B, DURATION, PRESSES, SHOWN, TILTS, screen, sensorAt, signed } from '../mega/mpu6050_read_button_display';

// | board    | nrf52840-dk                                          |
// | LCD bus  | w-P0.04-RS, w-P0.05-E, w-P0.02-D4, w-P0.31-D5 … D7   |
// | button   | w-P1.11-BTN, w-P1.11-RPD (P1.11 interrupt)           |
// | MPU6050  | w-P0.21-SDA, w-P0.27-SCL                             |

type Lcd = HTMLElement & { text: string };
type Button = HTMLElement & { pressed: boolean };

// Cell coordinates: the button and IMU sit left of the DK's top corner. LCD1 is turned 90°,
// so its rows are repeated upright in the free strip under the DK, beside the panel.
const READ = { x: 230, y: 302, w: 350, h: 98 };
const PANEL = { x: -220, y: 265, w: 340, h: 140 };

const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-mpbn-panel {
          position: absolute; left: ${PANEL.x}px; top: ${PANEL.y}px; width: ${PANEL.w}px; height: ${PANEL.h}px;
          box-sizing: border-box; padding: 8px 14px; display: flex; flex-direction: column; justify-content: center;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
          font: 600 36px/1.2 var(--mono); color: var(--ink); white-space: pre;
        }
        .c-mpbn-panel b { font-weight: 600; color: var(--muted); }
        .c-mpbn-fresh { color: var(--accent); }
        .c-mpbn-title { font: 600 36px var(--sans); color: var(--muted); }
        .c-mpbn-read { position: absolute; left: ${READ.x}px; top: ${READ.y}px; width: ${READ.w}px; height: ${READ.h}px; box-sizing: border-box;
          padding: 6px 9px; border-radius: 4px; background: #6cb201; border: 3px solid #1f2937;
          font: 600 36px/41px ui-monospace, Menlo, monospace; color: #000; white-space: pre; overflow: hidden; }
      </style>
      <div class="c-mpbn-panel"><div class="c-mpbn-title">Sensor now</div><div><b>Ax</b> <span class="c-mpbn-ax"></span></div><div><b>Gx</b> <span class="c-mpbn-gx"></span></div></div>
      <div class="c-mpbn-read"></div>
      ${finger('f', { length: 48 })}`,
    bounds: [PANEL.x, PANEL.y, READ.x + READ.w, READ.y + READ.h],
  },
  run(t, view) {
    const sensor = sensorAt(t);
    const fresh = TILTS.some((at) => t >= at && t < at + 500);
    const ax = view.q<HTMLElement>('.c-mpbn-ax');
    const gx = view.q<HTMLElement>('.c-mpbn-gx');
    ax.textContent = `${signed(sensor.ax)} g`;
    gx.textContent = `${signed(sensor.gx)} °/s`;
    ax.classList.toggle('c-mpbn-fresh', fresh);
    gx.classList.toggle('c-mpbn-fresh', fresh);

    const btn = view.box('BTN');
    const pressing = pressFinger(view, 'f', t, { x: btn.x + btn.w / 2, y: btn.y + btn.h / 2 + 4 }, PRESSES);
    view.part<Button>('BTN').pressed = pressing;
    if (pressing) {
      view.glowWire('w-P1.11-BTN', 1);
      view.glowWire('w-P1.11-RPD', 1);
    }

    const text = screen(SHOWN.filter((s) => s <= t).length === 1 ? A : B);
    view.part<Lcd>('LCD1').text = text;
    view.q<HTMLElement>('.c-mpbn-read').textContent = `${text.slice(0, 16).trimEnd()}\n${text.slice(16).trimEnd()}`;
  },
  activity: [
    { wires: ['w-P0.21-SDA', 'w-P0.27-SCL'], at: PRESSES.map(([down]) => down + 5) },
    { wires: ['w-P0.04-RS', 'w-P0.05-E', 'w-P0.02-D4', 'w-P0.31-D5', 'w-P0.29-D6', 'w-P0.30-D7'], at: SHOWN.map((s) => s - 3) },
  ],
};

export default cell;

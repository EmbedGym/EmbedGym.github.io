import type { Cell } from '../../cell';
import { finger, pressFinger } from '../../decor/finger';
import { A, B, DURATION, PRESSES, SHOWN, TILTS, screen, sensorAt, signed } from '../mega/mpu6050_read_button_display';

// | board    | arduino-uno                        |
// | LCD bus  | w-12-RS, w-11-E, w-4-D4 … w-7-D7   |
// | button   | w-2-BTN, w-2-RPD (D2 interrupt)    |
// | MPU6050  | w-A4-SDA, w-A5-SCL                 |

type Lcd = HTMLElement & { text: string };
type Button = HTMLElement & { pressed: boolean };

// Cell coordinates: LCD1 is turned 270° left of the board, so its rows are repeated
// upright above the board; the panel sits right of the IMU (x 433..494, y 88..170).
const READ = { x: 0, y: -245, w: 376, h: 98 };
const PANEL = { x: 510, y: 50, w: 330, h: 150 };

const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-mpbu-panel {
          position: absolute; left: ${PANEL.x}px; top: ${PANEL.y}px; width: ${PANEL.w}px; height: ${PANEL.h}px;
          box-sizing: border-box; padding: 8px 14px; display: flex; flex-direction: column; justify-content: center;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
          font: 600 35px/1.25 var(--mono); color: var(--ink); white-space: pre;
        }
        .c-mpbu-panel b { font-weight: 600; color: var(--muted); }
        .c-mpbu-fresh { color: var(--accent); }
        .c-mpbu-title { font: 600 35px var(--sans); color: var(--muted); }
        .c-mpbu-read { position: absolute; left: ${READ.x}px; top: ${READ.y}px; width: ${READ.w}px; height: ${READ.h}px; box-sizing: border-box;
          padding: 6px 9px; border-radius: 4px; background: #6cb201; border: 3px solid #1f2937;
          font: 600 35px/40px ui-monospace, Menlo, monospace; color: #000; white-space: pre; overflow: hidden; }
      </style>
      <div class="c-mpbu-panel"><div class="c-mpbu-title">Sensor now</div><div><b>Ax</b> <span class="c-mpbu-ax"></span></div><div><b>Gx</b> <span class="c-mpbu-gx"></span></div></div>
      <div class="c-mpbu-read"></div>
      ${finger('f', { length: 48 })}`,
    bounds: [READ.x, READ.y, PANEL.x + PANEL.w, PANEL.y + PANEL.h],
  },
  run(t, view) {
    const sensor = sensorAt(t);
    const fresh = TILTS.some((at) => t >= at && t < at + 500);
    const ax = view.q<HTMLElement>('.c-mpbu-ax');
    const gx = view.q<HTMLElement>('.c-mpbu-gx');
    ax.textContent = `${signed(sensor.ax)} g`;
    gx.textContent = `${signed(sensor.gx)} °/s`;
    ax.classList.toggle('c-mpbu-fresh', fresh);
    gx.classList.toggle('c-mpbu-fresh', fresh);

    const btn = view.box('BTN');
    const pressing = pressFinger(view, 'f', t, { x: btn.x + btn.w / 2, y: btn.y + btn.h / 2 + 4 }, PRESSES);
    view.part<Button>('BTN').pressed = pressing;
    if (pressing) {
      view.glowWire('w-2-BTN', 1);
      view.glowWire('w-2-RPD', 1);
    }

    const text = screen(SHOWN.filter((s) => s <= t).length === 1 ? A : B);
    view.part<Lcd>('LCD1').text = text;
    view.q<HTMLElement>('.c-mpbu-read').textContent = `${text.slice(0, 16).trimEnd()}\n${text.slice(16).trimEnd()}`;
  },
  activity: [
    { wires: ['w-A4-SDA', 'w-A5-SCL'], at: PRESSES.map(([down]) => down + 5) },
    { wires: ['w-12-RS', 'w-11-E', 'w-4-D4', 'w-5-D5', 'w-6-D6', 'w-7-D7'], at: SHOWN.map((s) => s - 3) },
  ],
};

export default cell;

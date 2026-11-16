import type { Cell } from '../../cell';
import { finger, pressFinger } from '../../decor/finger';
import { A, B, DURATION, PRESSES, SHOWN, TILTS, screen, sensorAt, signed } from '../mega/mpu6050_read_button_display';

// | board    | esp32-s3                                     |
// | LCD bus  | w-38-RS, w-39-E, w-40-D4 … w-42-D6, w-21-D7  |
// | button   | w-12-BTN, w-12-RPD (GPIO12 interrupt)        |
// | MPU6050  | w-9-SDA, w-10-SCL                            |

type Lcd = HTMLElement & { text: string };
type Button = HTMLElement & { pressed: boolean };

// Cell coordinates: the IMU spans x -196..-135, y 124..205; its GND lead climbs at x -220.
const PANEL = { x: -580, y: 92, w: 340, h: 150 };

const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-mpbe-panel {
          position: absolute; left: ${PANEL.x}px; top: ${PANEL.y}px; width: ${PANEL.w}px; height: ${PANEL.h}px;
          box-sizing: border-box; padding: 8px 14px; display: flex; flex-direction: column; justify-content: center;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
          font: 600 36px/1.25 var(--mono); color: var(--ink); white-space: pre;
        }
        .c-mpbe-panel b { font-weight: 600; color: var(--muted); }
        .c-mpbe-fresh { color: var(--accent); }
        .c-mpbe-title { font: 600 36px var(--sans); color: var(--muted); }
      </style>
      <div class="c-mpbe-panel"><div class="c-mpbe-title">Sensor now</div><div><b>Ax</b> <span class="c-mpbe-ax"></span></div><div><b>Gx</b> <span class="c-mpbe-gx"></span></div></div>
      ${finger('f', { length: 48 })}`,
    bounds: [PANEL.x, PANEL.y, PANEL.x + PANEL.w, PANEL.y + PANEL.h],
  },
  run(t, view) {
    const sensor = sensorAt(t);
    const fresh = TILTS.some((at) => t >= at && t < at + 500);
    const ax = view.q<HTMLElement>('.c-mpbe-ax');
    const gx = view.q<HTMLElement>('.c-mpbe-gx');
    ax.textContent = `${signed(sensor.ax)} g`;
    gx.textContent = `${signed(sensor.gx)} °/s`;
    ax.classList.toggle('c-mpbe-fresh', fresh);
    gx.classList.toggle('c-mpbe-fresh', fresh);

    const btn = view.box('BTN');
    const pressing = pressFinger(view, 'f', t, { x: btn.x + btn.w / 2, y: btn.y + btn.h / 2 + 4 }, PRESSES);
    view.part<Button>('BTN').pressed = pressing;
    if (pressing) {
      view.glowWire('w-12-BTN', 1);
      view.glowWire('w-12-RPD', 1);
    }

    view.part<Lcd>('LCD1').text = screen(SHOWN.filter((s) => s <= t).length === 1 ? A : B);
  },
  activity: [
    { wires: ['w-9-SDA', 'w-10-SCL'], at: PRESSES.map(([down]) => down + 5) },
    { wires: ['w-38-RS', 'w-39-E', 'w-40-D4', 'w-41-D5', 'w-42-D6', 'w-21-D7'], at: SHOWN.map((s) => s - 3) },
  ],
};

export default cell;

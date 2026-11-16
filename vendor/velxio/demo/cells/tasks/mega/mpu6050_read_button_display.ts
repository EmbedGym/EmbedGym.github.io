import type { Cell } from '../../cell';
import { finger, pressFinger } from '../../decor/finger';

type Lcd = HTMLElement & { text: string };
type Button = HTMLElement & { pressed: boolean };

// The MPU6050 tilts one way and a press puts that reading on the LCD; it tilts back
// and the LCD keeps the old reading until the second press, which the loop starts on.
export const DURATION = 5200;
export const A = { ax: 0.5025, gx: 100.4 };
export const B = { ax: -0.2525, gx: -50.4 };
export const TILTS = [500, 2900];
export const PRESSES: [number, number][] = [
  [1400, 1650],
  [3900, 4150],
];
// The interrupt sets a flag; loop() reads 14 bytes over I2C and rewrites both rows.
export const SHOWN = PRESSES.map(([down]) => down + 30);

export const sensorAt = (t: number) => (t >= TILTS[0] && t < TILTS[1] ? A : B);

const row = (s: string) => s.padEnd(16, ' ');
export function screen(p: { ax: number; gx: number }) {
  const ax = Math.trunc(p.ax * 16384) / 16384;
  const gx = Math.trunc(p.gx * 131) / 131;
  return row(`Ax(g): ${ax.toFixed(2)}`) + row(`Gx(dps): ${gx.toFixed(2)}`);
}
export const signed = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(2)}`;

// Cell coordinates: the IMU spans x 404..486, y -66..-5; its GND lane runs at x 510.
const PANEL = { x: 528, y: -130, w: 280, h: 130 };

const mpuButtonDisplay: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-mpb-panel {
          position: absolute; left: ${PANEL.x}px; top: ${PANEL.y}px; width: ${PANEL.w}px; height: ${PANEL.h}px;
          box-sizing: border-box; padding: 8px 14px; display: flex; flex-direction: column; justify-content: center;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
          font: 600 28px/1.3 var(--mono); color: var(--ink); white-space: pre;
        }
        .c-mpb-panel b { font-weight: 600; color: var(--muted); }
        .c-mpb-fresh { color: var(--accent); }
        .c-mpb-title { font: 600 27px var(--sans); color: var(--muted); }
      </style>
      <div class="c-mpb-panel"><div class="c-mpb-title">Sensor now</div><div><b>Ax</b> <span class="c-mpb-ax"></span></div><div><b>Gx</b> <span class="c-mpb-gx"></span></div></div>
      ${finger('f', { length: 48 })}`,
    bounds: [PANEL.x, PANEL.y, PANEL.x + PANEL.w, PANEL.y + PANEL.h],
  },
  run(t, view) {
    const sensor = sensorAt(t);
    const fresh = TILTS.some((at) => t >= at && t < at + 500);
    const ax = view.q<HTMLElement>('.c-mpb-ax');
    const gx = view.q<HTMLElement>('.c-mpb-gx');
    ax.textContent = `${signed(sensor.ax)} g`;
    gx.textContent = `${signed(sensor.gx)} °/s`;
    ax.classList.toggle('c-mpb-fresh', fresh);
    gx.classList.toggle('c-mpb-fresh', fresh);

    const btn = view.box('BTN');
    const pressing = pressFinger(view, 'f', t, { x: btn.x + btn.w / 2, y: btn.y + btn.h / 2 + 4 }, PRESSES);
    view.part<Button>('BTN').pressed = pressing;
    if (pressing) {
      view.glowWire('w-2-BTN', 1);
      view.glowWire('w-2-RPD', 1);
    }

    const lastShown = SHOWN.filter((s) => s <= t).length;
    view.part<Lcd>('LCD1').text = screen(lastShown === 1 ? A : B);
  },
  activity: [
    { wires: ['w-20-SDA', 'w-21-SCL'], at: PRESSES.map(([down]) => down + 5) },
    { wires: ['w-12-RS', 'w-11-E', 'w-4-D4', 'w-5-D5', 'w-6-D6', 'w-7-D7'], at: SHOWN.map((s) => s - 3) },
  ],
};

export default mpuButtonDisplay;

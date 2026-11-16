import type { Cell } from '../../cell';
import { DURATION, SAMPLES, UPDATES, phaseAt, spellStart } from '../mega/mpu6050_read_periodic_display';

// | board    | esp32-s3                                     |
// | LCD bus  | w-38-RS, w-39-E, w-40-D4 … w-42-D6, w-21-D7  |
// | MPU6050  | w-9-SDA, w-10-SCL                            |

type Lcd = HTMLElement & { text: string };

// main() divides the 10-sample sums as doubles and prints them with %.2f, which rounds
// a tie to even (0.125 -> "0.12"), unlike the Mega sketch's integer average.
function printf2(v: number) {
  const s = Math.abs(v) * 100;
  const f = Math.floor(s);
  const n = s - f > 0.5 || (s - f === 0.5 && f % 2 === 1) ? f + 1 : f;
  return `${v < 0 ? '-' : ''}${(n / 100).toFixed(2)}`;
}
const row = (s: string) => s.padEnd(16, ' ');
function screenAt(update: number) {
  // The 10th sample is taken at the update itself, just before the print.
  const window = Array.from({ length: 10 }, (_, i) => phaseAt(update - 900 + i * 100));
  const ax = window.reduce((s, p) => s + Math.trunc(p.ax * 16384), 0) / 10 / 16384;
  const gx = window.reduce((s, p) => s + Math.trunc(p.gx * 131), 0) / 10 / 131;
  return row(`Ax(g): ${printf2(ax)}`) + row(`Gx(dps): ${printf2(gx)}`);
}
// Cell coordinates: the IMU spans x -120..-59, y 124..205; its GND lead climbs at x -150.
const PANEL = { x: -510, y: 70, w: 340, h: 200 };

const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-mppe-panel {
          position: absolute; left: ${PANEL.x}px; top: ${PANEL.y}px; width: ${PANEL.w}px; height: ${PANEL.h}px;
          box-sizing: border-box; padding: 6px 14px; display: flex; flex-direction: column; justify-content: center;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
          font: 600 36px/1.2 var(--mono); color: var(--ink); white-space: pre;
        }
        .c-mppe-panel b { font-weight: 600; color: var(--muted); }
        .c-mppe-fresh { color: var(--accent); }
        .c-mppe-title { font: 600 36px/1.2 var(--sans); color: var(--muted); }
      </style>
      <div class="c-mppe-panel"><div class="c-mppe-title">Sensor now</div><div><b>Ax</b> <span class="c-mppe-ax"></span></div><div><b>Gx</b> <span class="c-mppe-gx"></span></div><div class="c-mppe-title">LCD: 1 s average</div></div>`,
    bounds: [PANEL.x, PANEL.y, PANEL.x + PANEL.w, PANEL.y + PANEL.h],
  },
  run(t, view) {
    const phase = phaseAt(t);
    const fresh = phaseAt(t - 500) !== phase && t - spellStart(t) < 400;
    const ax = view.q<HTMLElement>('.c-mppe-ax');
    const gx = view.q<HTMLElement>('.c-mppe-gx');
    ax.textContent = `${phase.ax > 0 ? '+' : ''}${phase.ax.toFixed(2)} g`;
    gx.textContent = `${phase.gx > 0 ? '+' : ''}${phase.gx.toFixed(2)} °/s`;
    ax.classList.toggle('c-mppe-fresh', fresh);
    gx.classList.toggle('c-mppe-fresh', fresh);

    const last = UPDATES.filter((u) => u <= t).pop() ?? 0;
    view.part<Lcd>('LCD1').text = screenAt(last);
  },
  activity: [
    { wires: ['w-9-SDA', 'w-10-SCL'], at: SAMPLES.map((ms) => ms + 2) },
    { wires: ['w-38-RS', 'w-39-E', 'w-40-D4', 'w-41-D5', 'w-42-D6', 'w-21-D7'], at: UPDATES.map((u) => u + 4) },
  ],
};

export default cell;

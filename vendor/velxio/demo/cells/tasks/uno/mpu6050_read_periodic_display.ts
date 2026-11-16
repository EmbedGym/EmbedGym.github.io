import type { Cell } from '../../cell';
import { DURATION, SAMPLES, UPDATES, phaseAt, spellStart } from '../mega/mpu6050_read_periodic_display';

// | board    | arduino-uno                        |
// | LCD bus  | w-12-RS, w-11-E, w-4-D4 … w-7-D7   |
// | MPU6050  | w-A4-SDA, w-A5-SCL                 |

type Lcd = HTMLElement & { text: string };

// loop() prints right after its 10th sample, taken at the update itself; it averages the
// raw readings as integers before scaling.
const row = (s: string) => s.padEnd(16, ' ');
function screenAt(update: number) {
  const window = Array.from({ length: 10 }, (_, i) => phaseAt(update - 900 + i * 100));
  const ax = Math.trunc(window.reduce((s, p) => s + Math.trunc(p.ax * 16384), 0) / 10) / 16384;
  const gx = Math.trunc(window.reduce((s, p) => s + Math.trunc(p.gx * 131), 0) / 10) / 131;
  return row(`Ax(g): ${ax.toFixed(2)}`) + row(`Gx(dps): ${gx.toFixed(2)}`);
}

// Cell coordinates: LCD1 is turned 270° left of the board, so its rows are repeated
// upright above the board; the panel sits right of the IMU (x 433..494, y 88..170).
const READ = { x: 0, y: -245, w: 376, h: 98 };
const PANEL = { x: 510, y: 30, w: 330, h: 196 };

const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-mppu-panel {
          position: absolute; left: ${PANEL.x}px; top: ${PANEL.y}px; width: ${PANEL.w}px; height: ${PANEL.h}px;
          box-sizing: border-box; padding: 6px 14px; display: flex; flex-direction: column; justify-content: center;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
          font: 600 35px/1.2 var(--mono); color: var(--ink); white-space: pre;
        }
        .c-mppu-panel b { font-weight: 600; color: var(--muted); }
        .c-mppu-fresh { color: var(--accent); }
        .c-mppu-title { font: 600 35px/1.2 var(--sans); color: var(--muted); }
        .c-mppu-read { position: absolute; left: ${READ.x}px; top: ${READ.y}px; width: ${READ.w}px; height: ${READ.h}px; box-sizing: border-box;
          padding: 6px 9px; border-radius: 4px; background: #6cb201; border: 3px solid #1f2937;
          font: 600 36px/41px ui-monospace, Menlo, monospace; color: #000; white-space: pre; overflow: hidden; }
      </style>
      <div class="c-mppu-panel"><div class="c-mppu-title">Sensor now</div><div><b>Ax</b> <span class="c-mppu-ax"></span></div><div><b>Gx</b> <span class="c-mppu-gx"></span></div><div class="c-mppu-title">LCD: 1 s average</div></div>
      <div class="c-mppu-read"></div>`,
    bounds: [READ.x, READ.y, PANEL.x + PANEL.w, PANEL.y + PANEL.h],
  },
  run(t, view) {
    const phase = phaseAt(t);
    const fresh = phaseAt(t - 500) !== phase && t - spellStart(t) < 400;
    const ax = view.q<HTMLElement>('.c-mppu-ax');
    const gx = view.q<HTMLElement>('.c-mppu-gx');
    ax.textContent = `${phase.ax > 0 ? '+' : ''}${phase.ax.toFixed(2)} g`;
    gx.textContent = `${phase.gx > 0 ? '+' : ''}${phase.gx.toFixed(2)} °/s`;
    ax.classList.toggle('c-mppu-fresh', fresh);
    gx.classList.toggle('c-mppu-fresh', fresh);

    const last = UPDATES.filter((u) => u <= t).pop() ?? 0;
    const text = screenAt(last);
    view.part<Lcd>('LCD1').text = text;
    view.q<HTMLElement>('.c-mppu-read').textContent = `${text.slice(0, 16).trimEnd()}\n${text.slice(16).trimEnd()}`;
  },
  activity: [
    { wires: ['w-A4-SDA', 'w-A5-SCL'], at: SAMPLES.map((ms) => ms + 2) },
    { wires: ['w-12-RS', 'w-11-E', 'w-4-D4', 'w-5-D5', 'w-6-D6', 'w-7-D7'], at: UPDATES.map((u) => u + 4) },
  ],
};

export default cell;

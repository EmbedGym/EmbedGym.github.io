import type { Cell } from '../../cell';
import { DURATION, SAMPLES, UPDATES, phaseAt, spellStart } from '../mega/mpu6050_read_periodic_display';

// | board    | nrf52840-dk                                          |
// | LCD bus  | w-P0.04-RS, w-P0.05-E, w-P0.02-D4, w-P0.31-D5 … D7   |
// | MPU6050  | w-P0.21-SDA, w-P0.27-SCL                             |

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
// Cell coordinates: the IMU spans x -111..-50, y -40..42 left of the DK's top corner; the
// panel hangs under it, left of VDD's riser (x -42). LCD1 is turned 90°, so its rows are
// repeated upright in the free strip under the DK.
const READ = { x: 230, y: 302, w: 350, h: 98 };
const PANEL = { x: -362, y: 55, w: 310, h: 190 };

const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-mppn-panel {
          position: absolute; left: ${PANEL.x}px; top: ${PANEL.y}px; width: ${PANEL.w}px; height: ${PANEL.h}px;
          box-sizing: border-box; padding: 6px 8px; display: flex; flex-direction: column; justify-content: center;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
          font: 600 36px/1.15 var(--mono); color: var(--ink); white-space: pre;
        }
        .c-mppn-panel b { font-weight: 600; color: var(--muted); }
        .c-mppn-fresh { color: var(--accent); }
        .c-mppn-title { font: 600 36px/1.15 var(--sans); color: var(--muted); }
        .c-mppn-read { position: absolute; left: ${READ.x}px; top: ${READ.y}px; width: ${READ.w}px; height: ${READ.h}px; box-sizing: border-box;
          padding: 6px 9px; border-radius: 4px; background: #6cb201; border: 3px solid #1f2937;
          font: 600 36px/41px ui-monospace, Menlo, monospace; color: #000; white-space: pre; overflow: hidden; }
      </style>
      <div class="c-mppn-panel"><div class="c-mppn-title">Sensor now</div><div><b>Ax</b> <span class="c-mppn-ax"></span></div><div><b>Gx</b> <span class="c-mppn-gx"></span></div><div class="c-mppn-title">LCD: 1 s average</div></div>
      <div class="c-mppn-read"></div>`,
    bounds: [PANEL.x, PANEL.y, READ.x + READ.w, READ.y + READ.h],
  },
  run(t, view) {
    const phase = phaseAt(t);
    const fresh = phaseAt(t - 500) !== phase && t - spellStart(t) < 400;
    const ax = view.q<HTMLElement>('.c-mppn-ax');
    const gx = view.q<HTMLElement>('.c-mppn-gx');
    ax.textContent = `${phase.ax > 0 ? '+' : ''}${phase.ax.toFixed(2)} g`;
    gx.textContent = `${phase.gx > 0 ? '+' : ''}${phase.gx.toFixed(2)} °/s`;
    ax.classList.toggle('c-mppn-fresh', fresh);
    gx.classList.toggle('c-mppn-fresh', fresh);

    const last = UPDATES.filter((u) => u <= t).pop() ?? 0;
    const text = screenAt(last);
    view.part<Lcd>('LCD1').text = text;
    view.q<HTMLElement>('.c-mppn-read').textContent = `${text.slice(0, 16).trimEnd()}\n${text.slice(16).trimEnd()}`;
  },
  activity: [
    { wires: ['w-P0.21-SDA', 'w-P0.27-SCL'], at: SAMPLES.map((ms) => ms + 2) },
    { wires: ['w-P0.04-RS', 'w-P0.05-E', 'w-P0.02-D4', 'w-P0.31-D5', 'w-P0.29-D6', 'w-P0.30-D7'], at: UPDATES.map((u) => u + 4) },
  ],
};

export default cell;

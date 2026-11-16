import type { Cell } from '../../cell';

type Lcd = HTMLElement & { text: string };

// The MPU6050 alternates between two motions in 500 ms spells. The sketch samples it
// every 100 ms and every 10th sample prints the average, so the LCD shows each
// second's mix: all one motion, all the other, or half of each.
export const DURATION = 4000;
export const A = { ax: 0.5025, gx: 100.4 };
export const B = { ax: -0.2525, gx: -50.4 };
const SPELLS = [A, A, A, B, B, B, B, A];
export const phaseAt = (t: number) => SPELLS[Math.floor((((t % DURATION) + DURATION) % DURATION) / 500)];
export const spellStart = (t: number) => Math.floor(t / 500) * 500;
export const SAMPLES = Array.from({ length: DURATION / 100 }, (_, i) => i * 100);
export const UPDATES = [0, 1000, 2000, 3000];

const row = (s: string) => s.padEnd(16, ' ');
export function screenAt(update: number) {
  const window = Array.from({ length: 10 }, (_, i) => phaseAt(update - 1000 + i * 100));
  const ax = Math.trunc(window.reduce((s, p) => s + Math.trunc(p.ax * 16384), 0) / 10) / 16384;
  const gx = Math.trunc(window.reduce((s, p) => s + Math.trunc(p.gx * 131), 0) / 10) / 131;
  return row(`Ax(g): ${ax.toFixed(2)}`) + row(`Gx(dps): ${gx.toFixed(2)}`);
}

// Cell coordinates: the IMU spans x 404..486, y -66..-5; its GND lane runs at x 510.
const PANEL = { x: 528, y: -140, w: 300, h: 170 };

const mpuPeriodicDisplay: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-mpp-panel {
          position: absolute; left: ${PANEL.x}px; top: ${PANEL.y}px; width: ${PANEL.w}px; height: ${PANEL.h}px;
          box-sizing: border-box; padding: 8px 14px; display: flex; flex-direction: column; justify-content: center;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
          font: 600 28px/1.3 var(--mono); color: var(--ink); white-space: pre;
        }
        .c-mpp-panel b { font-weight: 600; color: var(--muted); }
        .c-mpp-fresh { color: var(--accent); }
        .c-mpp-title { font: 600 27px var(--sans); color: var(--muted); }
      </style>
      <div class="c-mpp-panel"><div class="c-mpp-title">Sensor now</div><div><b>Ax</b> <span class="c-mpp-ax"></span></div><div><b>Gx</b> <span class="c-mpp-gx"></span></div><div class="c-mpp-title">LCD: 1 s average</div></div>`,
    bounds: [PANEL.x, PANEL.y, PANEL.x + PANEL.w, PANEL.y + PANEL.h],
  },
  run(t, view) {
    const phase = phaseAt(t);
    const fresh = phaseAt(t - 500) !== phase && t - spellStart(t) < 400;
    const ax = view.q<HTMLElement>('.c-mpp-ax');
    const gx = view.q<HTMLElement>('.c-mpp-gx');
    ax.textContent = `${phase.ax > 0 ? '+' : ''}${phase.ax.toFixed(2)} g`;
    gx.textContent = `${phase.gx > 0 ? '+' : ''}${phase.gx.toFixed(2)} °/s`;
    ax.classList.toggle('c-mpp-fresh', fresh);
    gx.classList.toggle('c-mpp-fresh', fresh);

    const last = UPDATES.filter((u) => u <= t).pop() ?? 0;
    view.part<Lcd>('LCD1').text = screenAt(last);
  },
  activity: [
    { wires: ['w-20-SDA', 'w-21-SCL'], at: SAMPLES.map((ms) => ms + 2) },
    { wires: ['w-12-RS', 'w-11-E', 'w-4-D4', 'w-5-D5', 'w-6-D6', 'w-7-D7'], at: UPDATES.map((u) => u + 4) },
  ],
};

export default mpuPeriodicDisplay;

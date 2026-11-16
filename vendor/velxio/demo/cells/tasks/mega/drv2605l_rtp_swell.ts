import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial, type Print } from '../../kit';
import { setVibration, vibration } from '../../decor/vibration';

type Haptic = HTMLElement & { vibrating: boolean };

// One sketch cycle: RTP 128 → 248 in steps of 8 every 50 ms, 255 ("Peak"),
// 247 → 135 back down, 128, then 1 s of rest and "Cycle n done". 2600 ms per
// cycle; the loop holds two, starting 400 ms into the first ramp.
const CYCLE = 2600;
export const DURATION = 2 * CYCLE;
const START = -400;
export const PRINTS: Print[] = [
  { t: START + 800, text: 'Peak' },
  { t: START + CYCLE, text: 'Cycle 1 done' },
  { t: START + CYCLE + 800, text: 'Peak' },
  { t: START + 2 * CYCLE, text: 'Cycle 2 done' },
];

function levelInCycle(ms: number) {
  const step = Math.floor(ms / 50);
  if (step < 16) return 128 + 8 * step;
  if (step === 16) return 255;
  if (step < 32) return 247 - 8 * (step - 17);
  return 128;
}
export const levelAt = (t: number) => levelInCycle((((t - START) % CYCLE) + CYCLE) % CYCLE);

const SERIAL = { x: -276, y: USB.mega.y - 78, w: 246, h: 112 };
const PLOT = { x: -6, y: -150, w: 252, h: 112 };
export const GRAPH = { x: 16, w: 220, top: 50, base: 98 };
const WINDOW = 2600;
export const HEAD_X = GRAPH.x + GRAPH.w * 0.85;
const levelY = (v: number) => GRAPH.base - ((v - 128) / 127) * (GRAPH.base - GRAPH.top);

const MOTOR = { dx: 48, dy: 20 };

/** The plot's trace at `t`: the last 2.2 s of RTP level, newest at the playhead. */
export function tracePath(t: number) {
  const points: string[] = [];
  const span = WINDOW * 0.85;
  for (let x = GRAPH.x; x <= HEAD_X; x += 2) {
    const ms = t - ((HEAD_X - x) / (HEAD_X - GRAPH.x)) * span;
    points.push(`${x} ${levelY(levelAt(ms))}`);
  }
  return `M ${points.join(' L ')}`;
}

/** An RTP write every 50 ms while the level moves. */
export const RTP_WRITES = [0, 1, 2]
  .flatMap((k) => Array.from({ length: 33 }, (_, i) => START + k * CYCLE + 50 * i))
  .filter((t) => t >= 0 && t < DURATION);

const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-rs-panel {
          position: absolute; left: ${PLOT.x}px; top: ${PLOT.y}px; width: ${PLOT.w}px; height: ${PLOT.h}px;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08); font-family: var(--sans);
        }
        .c-rs-head { position: absolute; left: 16px; right: 16px; top: 8px; display: flex; justify-content: space-between;
          font-size: 24px; font-weight: 700; color: var(--ink); }
        .c-rs-val { font-family: var(--mono); color: var(--accent); }
        .c-rs-axis { stroke: #cfd6df; stroke-width: 2; }
        .c-rs-trace { fill: none; stroke: var(--accent); stroke-width: 3; stroke-linejoin: round; }
        .c-rs-now { stroke: var(--warn); stroke-width: 3; }
      </style>
      ${serialPanel('out', SERIAL, { note: '115200', cableTo: USB.mega })}
      <div class="c-rs-panel">
        <div class="c-rs-head"><span>RTP drive</span><span class="c-rs-val"></span></div>
        <svg width="${PLOT.w}" height="${PLOT.h}" style="position:absolute;left:0;top:0">
          <line class="c-rs-axis" x1="${GRAPH.x}" x2="${GRAPH.x + GRAPH.w}" y1="${GRAPH.base}" y2="${GRAPH.base}" />
          <line class="c-rs-axis" x1="${GRAPH.x}" x2="${GRAPH.x + GRAPH.w}" y1="${GRAPH.top}" y2="${GRAPH.top}" stroke-dasharray="4 5" />
          <path class="c-rs-trace" />
          <line class="c-rs-now" x1="${HEAD_X}" x2="${HEAD_X}" y1="${GRAPH.top - 6}" y2="${GRAPH.base + 6}" />
        </svg>
      </div>
      <div class="c-rs-motor" style="position:absolute">${vibration('motor')}</div>`,
    bounds: [SERIAL.x, PLOT.y, PLOT.x + PLOT.w, SERIAL.y + SERIAL.h],
  },
  activity: [{ wires: ['w-SDA', 'w-SCL'], at: RTP_WRITES }],
  run(t, view) {
    const level = levelAt(t);
    const drive = (level - 128) / 127;
    view.part<Haptic>('HAP1').vibrating = level > 128;

    const hap = view.box('HAP1');
    const motor = view.q<HTMLElement>('.c-rs-motor');
    motor.style.left = `${hap.x + MOTOR.dx}px`;
    motor.style.top = `${hap.y + MOTOR.dy}px`;
    setVibration(view, 'motor', drive);

    view.q<HTMLElement>('.c-rs-val').textContent = String(level);
    view.q<SVGPathElement>('.c-rs-trace').setAttribute('d', tracePath(t));

    showSerial(view, 'out', t, PRINTS, { board: 'arduino-mega', fadeFrom: DURATION - 320 });
  },
};

export default cell;

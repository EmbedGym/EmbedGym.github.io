import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial } from '../../kit';
import { setVibration, vibration } from '../../decor/vibration';
import { DURATION, GRAPH, HEAD_X, PRINTS, RTP_WRITES, levelAt, tracePath } from '../mega/drv2605l_rtp_swell';

type Haptic = HTMLElement & { vibrating: boolean };

// main.c: RTP 128 → 248 in steps of 8 every 50 ms, 255 and printf("Peak\n"),
// back down to 128, 1 s rest, printf("Cycle %d done\n"), as on the Mega.
const BOARD = 'esp32-s3';
const I2C_WIRES = ['w-38-SDA', 'w-39-SCL'];

// The board is tall, so the card's scale is low: the panels are drawn larger to stay legible.
// The serial panel sits under the board, right of the socket, one line at a time.
const SERIAL = { x: 44, y: 352, w: 330, h: 96 };
const PLOT = { x: 160, y: 64, w: 252, h: 112 };
const PLOT_ZOOM = 1.5;
// The breakout is turned 90°, so the motor disc is on its right and the arcs go above and below it.
const MOTOR = { dx: 91.2, dy: 48 };

const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-rse-panel {
          position: absolute; background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08); font-family: var(--sans); transform-origin: 0 0;
        }
        .c-rse-head { position: absolute; left: 16px; right: 16px; top: 8px; display: flex; justify-content: space-between;
          font-size: 24px; font-weight: 700; color: var(--ink); }
        .c-rse-val { font-family: var(--mono); color: var(--accent); }
        .c-rse-axis { stroke: #cfd6df; stroke-width: 2; }
        .c-rse-trace { fill: none; stroke: var(--accent); stroke-width: 3; stroke-linejoin: round; }
        .c-rse-now { stroke: var(--warn); stroke-width: 3; }
      </style>
      ${serialPanel('out', SERIAL, { note: '115200', cableTo: USB.esp32s3, fontSize: 36 })}
      <div class="c-rse-panel" style="left:${PLOT.x}px;top:${PLOT.y}px;width:${PLOT.w}px;height:${PLOT.h}px;transform:scale(${PLOT_ZOOM})">
        <div class="c-rse-head"><span>RTP drive</span><span class="c-rse-val"></span></div>
        <svg width="${PLOT.w}" height="${PLOT.h}" style="position:absolute;left:0;top:0">
          <line class="c-rse-axis" x1="${GRAPH.x}" x2="${GRAPH.x + GRAPH.w}" y1="${GRAPH.base}" y2="${GRAPH.base}" />
          <line class="c-rse-axis" x1="${GRAPH.x}" x2="${GRAPH.x + GRAPH.w}" y1="${GRAPH.top}" y2="${GRAPH.top}" stroke-dasharray="4 5" />
          <path class="c-rse-trace" />
          <line class="c-rse-now" x1="${HEAD_X}" x2="${HEAD_X}" y1="${GRAPH.top - 6}" y2="${GRAPH.base + 6}" />
        </svg>
      </div>
      <div class="c-rse-motor" style="position:absolute;transform:rotate(90deg)">${vibration('motor')}</div>`,
    bounds: [
      Math.min(SERIAL.x, PLOT.x),
      Math.min(SERIAL.y, PLOT.y),
      Math.max(SERIAL.x + SERIAL.w, PLOT.x + PLOT.w * PLOT_ZOOM),
      Math.max(SERIAL.y + SERIAL.h, PLOT.y + PLOT.h * PLOT_ZOOM),
    ],
  },
  activity: [{ wires: I2C_WIRES, at: RTP_WRITES }],
  run(t, view) {
    const level = levelAt(t);
    view.part<Haptic>('HAP1').vibrating = level > 128;

    const hap = view.box('HAP1');
    const motor = view.q<HTMLElement>('.c-rse-motor');
    motor.style.left = `${hap.x + MOTOR.dx}px`;
    motor.style.top = `${hap.y + MOTOR.dy}px`;
    setVibration(view, 'motor', (level - 128) / 127);

    view.q<HTMLElement>('.c-rse-val').textContent = String(level);
    view.q<SVGPathElement>('.c-rse-trace').setAttribute('d', tracePath(t));

    showSerial(view, 'out', t, PRINTS, { board: BOARD, fadeFrom: DURATION - 320 });
  },
};

export default cell;

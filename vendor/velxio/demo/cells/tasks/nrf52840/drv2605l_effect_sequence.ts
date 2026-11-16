import { clamp } from '../../anim';
import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial } from '../../kit';
import { setVibration, vibration } from '../../decor/vibration';
import { BUS, DURATION, PULSES, SEQ_MS, TRACK, msX, sequencePrints, sequenceState } from '../mega/drv2605l_effect_sequence';

type Haptic = HTMLElement & { vibrating: boolean };

// main.c: every 3 s GO, poll GO (k_sleep 1 ms) until the sequencer finishes
// (10 → 200 ms wait → 47, 400 ms), then printk the time; the poll ends 400–401 ms after GO.
const BOARD = 'nrf52840-dk';
const I2C_WIRES = ['w-P0.21-SDA', 'w-P0.27-SCL'];
const PRINTS = sequencePrints([400, 401]);

// One reading at a time: the line wraps onto two rows.
const SERIAL = { x: -350, y: 62, w: 280, h: 120 };
const PLOT = { x: -463, y: -86, w: 290, h: 112 };
// The breakout is turned 270°, so the motor disc is on its left and the arcs go above and below it.
const PLOT_ZOOM = 1.05;
const MOTOR = { dx: 20, dy: 48 };
const MOTOR_TURN = 90;

const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-dsqn-panel {
          position: absolute; background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08); font-family: var(--sans); transform-origin: 0 0;
        }
        .c-dsqn-title { position: absolute; left: 16px; top: 10px; font-size: 26px; font-weight: 700; color: var(--ink); white-space: nowrap; }
        .c-dsqn-base { stroke: #cfd6df; stroke-width: 3; }
        .c-dsqn-pulse { fill: #cfd6df; }
        .c-dsqn-pulse.on { fill: var(--accent); }
        .c-dsqn-wait { stroke: #9aa5b1; stroke-width: 3; stroke-dasharray: 6 6; }
        .c-dsqn-head { stroke: var(--warn); stroke-width: 3; }
      </style>
      ${serialPanel('out', SERIAL, { note: '115200', cableTo: USB.nrf52840, wrap: true, fontSize: 28 })}
      <div class="c-dsqn-panel" style="left:${PLOT.x}px;top:${PLOT.y}px;width:${PLOT.w}px;height:${PLOT.h}px;transform:scale(${PLOT_ZOOM})">
        <div class="c-dsqn-title">10 → 200 ms → 47</div>
        <svg width="${PLOT.w}" height="${PLOT.h}" style="position:absolute;left:0;top:0">
          <line class="c-dsqn-base" x1="${TRACK.x}" x2="${TRACK.x + TRACK.w}" y1="${TRACK.base}" y2="${TRACK.base}" />
          <line class="c-dsqn-wait" x1="${msX(112)}" x2="${msX(288)}" y1="${TRACK.base - 16}" y2="${TRACK.base - 16}" />
          ${PULSES.map(([a, b]) => `<rect class="c-dsqn-pulse" x="${msX(a)}" y="${TRACK.top}" width="${msX(b) - msX(a)}" height="${TRACK.base - TRACK.top}" rx="3" />`).join('')}
          ${PULSES.map(([a]) => `<rect class="c-dsqn-pulse on" x="${msX(a)}" y="${TRACK.top}" height="${TRACK.base - TRACK.top}" rx="3" />`).join('')}
          <line class="c-dsqn-head" y1="${TRACK.top - 8}" y2="${TRACK.base + 8}" />
        </svg>
      </div>
      <div class="c-dsqn-motor" style="position:absolute;transform:rotate(${MOTOR_TURN}deg)">${vibration('motor')}</div>`,
    bounds: [Math.min(SERIAL.x, PLOT.x), Math.min(SERIAL.y, PLOT.y), Math.max(SERIAL.x + SERIAL.w, PLOT.x + PLOT.w * PLOT_ZOOM), Math.max(SERIAL.y + SERIAL.h, PLOT.y + PLOT.h * PLOT_ZOOM)],
  },
  activity: [{ wires: I2C_WIRES, at: BUS }],
  run(t, view) {
    const { buzzing, shown, since, playing } = sequenceState(t);
    view.part<Haptic>('HAP1').vibrating = buzzing;

    const hap = view.box('HAP1');
    const motor = view.q<HTMLElement>('.c-dsqn-motor');
    motor.style.left = `${hap.x + MOTOR.dx}px`;
    motor.style.top = `${hap.y + MOTOR.dy}px`;
    setVibration(view, 'motor', buzzing ? 1 : 0);

    view.qa<SVGRectElement>('.c-dsqn-pulse.on').forEach((p, i) => {
      const [a, b] = PULSES[i];
      p.setAttribute('width', String(msX(clamp(shown, a, b)) - msX(a)));
    });
    const head = view.q<SVGLineElement>('.c-dsqn-head');
    const x = String(msX(clamp(since, 0, SEQ_MS)));
    head.setAttribute('x1', x);
    head.setAttribute('x2', x);
    head.style.opacity = playing ? '1' : '0';

    showSerial(view, 'out', t, PRINTS, { board: BOARD });
  },
};

export default cell;

import { clamp } from '../../anim';
import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial } from '../../kit';
import { setVibration, vibration } from '../../decor/vibration';
import { BUS, DURATION, PULSES, SEQ_MS, TRACK, msX, sequencePrints, sequenceState } from '../mega/drv2605l_effect_sequence';

type Haptic = HTMLElement & { vibrating: boolean };

// Same sketch as the Mega: every 3 s GO, poll GO until the sequencer finishes
// (10 → 200 ms wait → 47, 400 ms), then print the time. A run.sh serial run
// printed 399 and 400 ms.
const BOARD = 'arduino-uno';
const I2C_WIRES = ['w-SDA', 'w-SCL'];
const PRINTS = sequencePrints([399, 400]);

// One reading at a time: the line wraps onto two rows.
const SERIAL = { x: -298, y: USB.uno.y - 4, w: 260, h: 112 };
const PLOT = { x: -298, y: 180, w: 290, h: 112 };
// The breakout is turned 270°, so the motor disc is on its left and the arcs go above and below it.
const MOTOR = { dx: 20, dy: 48 };
const MOTOR_TURN = 90;

const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-dsqu-panel {
          position: absolute; background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08); font-family: var(--sans); transform-origin: 0 0;
        }
        .c-dsqu-title { position: absolute; left: 16px; top: 10px; font-size: 26px; font-weight: 700; color: var(--ink); white-space: nowrap; }
        .c-dsqu-base { stroke: #cfd6df; stroke-width: 3; }
        .c-dsqu-pulse { fill: #cfd6df; }
        .c-dsqu-pulse.on { fill: var(--accent); }
        .c-dsqu-wait { stroke: #9aa5b1; stroke-width: 3; stroke-dasharray: 6 6; }
        .c-dsqu-head { stroke: var(--warn); stroke-width: 3; }
      </style>
      ${serialPanel('out', SERIAL, { note: '115200', cableTo: USB.uno, wrap: true })}
      <div class="c-dsqu-panel" style="left:${PLOT.x}px;top:${PLOT.y}px;width:${PLOT.w}px;height:${PLOT.h}px">
        <div class="c-dsqu-title">10 → 200 ms → 47</div>
        <svg width="${PLOT.w}" height="${PLOT.h}" style="position:absolute;left:0;top:0">
          <line class="c-dsqu-base" x1="${TRACK.x}" x2="${TRACK.x + TRACK.w}" y1="${TRACK.base}" y2="${TRACK.base}" />
          <line class="c-dsqu-wait" x1="${msX(112)}" x2="${msX(288)}" y1="${TRACK.base - 16}" y2="${TRACK.base - 16}" />
          ${PULSES.map(([a, b]) => `<rect class="c-dsqu-pulse" x="${msX(a)}" y="${TRACK.top}" width="${msX(b) - msX(a)}" height="${TRACK.base - TRACK.top}" rx="3" />`).join('')}
          ${PULSES.map(([a]) => `<rect class="c-dsqu-pulse on" x="${msX(a)}" y="${TRACK.top}" height="${TRACK.base - TRACK.top}" rx="3" />`).join('')}
          <line class="c-dsqu-head" y1="${TRACK.top - 8}" y2="${TRACK.base + 8}" />
        </svg>
      </div>
      <div class="c-dsqu-motor" style="position:absolute;transform:rotate(${MOTOR_TURN}deg)">${vibration('motor')}</div>`,
    bounds: [SERIAL.x, SERIAL.y, PLOT.x + PLOT.w, PLOT.y + PLOT.h],
  },
  activity: [{ wires: I2C_WIRES, at: BUS }],
  run(t, view) {
    const { buzzing, shown, since, playing } = sequenceState(t);
    view.part<Haptic>('HAP1').vibrating = buzzing;

    const hap = view.box('HAP1');
    const motor = view.q<HTMLElement>('.c-dsqu-motor');
    motor.style.left = `${hap.x + MOTOR.dx}px`;
    motor.style.top = `${hap.y + MOTOR.dy}px`;
    setVibration(view, 'motor', buzzing ? 1 : 0);

    view.qa<SVGRectElement>('.c-dsqu-pulse.on').forEach((p, i) => {
      const [a, b] = PULSES[i];
      p.setAttribute('width', String(msX(clamp(shown, a, b)) - msX(a)));
    });
    const head = view.q<SVGLineElement>('.c-dsqu-head');
    const x = String(msX(clamp(since, 0, SEQ_MS)));
    head.setAttribute('x1', x);
    head.setAttribute('x2', x);
    head.style.opacity = playing ? '1' : '0';

    showSerial(view, 'out', t, PRINTS, { board: BOARD });
  },
};

export default cell;

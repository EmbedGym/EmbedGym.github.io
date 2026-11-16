import { clamp, sinceLast } from '../../anim';
import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial, type Print } from '../../kit';
import { setVibration, vibration } from '../../decor/vibration';

type Haptic = HTMLElement & { vibrating: boolean };

// Every 3 s the sketch writes GO, polls GO until the sequencer finishes and
// prints the time. The model plays effect 10 (double click) for 100 ms, waits
// 200 ms, then plays effect 47 (buzz) for 100 ms: 400 ms in all.
export const DURATION = 6000;
export const TRIGGERS = [600, 3600];
export const SEQ_MS = 400;
export const PULSES: [number, number][] = [
  [0, 40],
  [60, 100],
  [300, 400],
];
/** The two runs' "Sequence done" lines, the previous loop's already on screen at t=0 to match the end state. */
export function sequencePrints(elapsed: [number, number]): Print[] {
  const loop: Print[] = TRIGGERS.map((t, i) => ({ t: t + SEQ_MS + 2, text: `Sequence done in ${elapsed[i]} ms` }));
  return [...loop.map((p) => ({ ...p, t: p.t - DURATION })), ...loop];
}
const PRINTS = sequencePrints([400, 401]);
// GO, then the GO polls while the sequence plays.
export const BUS = TRIGGERS.flatMap((t) => [t, t + 100, t + 200, t + 300, t + SEQ_MS]);

const SERIAL = { x: -300, y: USB.mega.y - 82, w: 278, h: 180 };
const PLOT = { x: -44, y: -150, w: 290, h: 112 };
export const TRACK = { x: 18, w: 254, base: 92, top: 58 };
export const msX = (ms: number) => TRACK.x + (TRACK.w * ms) / SEQ_MS;

const MOTOR = { dx: 48, dy: 20 };

/** Where the sequence is at `t`: ms since GO, whether it plays, whether the motor runs, and how much of the plot is filled. */
export function sequenceState(t: number) {
  const since = sinceLast(t, TRIGGERS);
  const playing = since < SEQ_MS;
  const buzzing = playing && PULSES.some(([a, b]) => since >= a && since < b);
  // The plot fills in as the sequence plays and stays full until the monitor prints, then clears for the next run.
  const shown = playing ? since : since < 900 ? SEQ_MS : -1;
  return { since, playing, buzzing, shown };
}

const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-dseq-panel {
          position: absolute; left: ${PLOT.x}px; top: ${PLOT.y}px; width: ${PLOT.w}px; height: ${PLOT.h}px;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08); font-family: var(--sans);
        }
        .c-dseq-title { position: absolute; left: 16px; top: 10px; font-size: 26px; font-weight: 700; color: var(--ink); white-space: nowrap; }
        .c-dseq-base { stroke: #cfd6df; stroke-width: 3; }
        .c-dseq-pulse { fill: #cfd6df; }
        .c-dseq-pulse.on { fill: var(--accent); }
        .c-dseq-wait { stroke: #9aa5b1; stroke-width: 3; stroke-dasharray: 6 6; }
        .c-dseq-head { stroke: var(--warn); stroke-width: 3; }
      </style>
      ${serialPanel('out', SERIAL, { note: '115200', cableTo: USB.mega, wrap: true })}
      <div class="c-dseq-panel">
        <div class="c-dseq-title">10 → 200 ms → 47</div>
        <svg width="${PLOT.w}" height="${PLOT.h}" style="position:absolute;left:0;top:0">
          <line class="c-dseq-base" x1="${TRACK.x}" x2="${TRACK.x + TRACK.w}" y1="${TRACK.base}" y2="${TRACK.base}" />
          <line class="c-dseq-wait" x1="${msX(112)}" x2="${msX(288)}" y1="${TRACK.base - 16}" y2="${TRACK.base - 16}" />
          ${PULSES.map(([a, b]) => `<rect class="c-dseq-pulse" x="${msX(a)}" y="${TRACK.top}" width="${msX(b) - msX(a)}" height="${TRACK.base - TRACK.top}" rx="3" />`).join('')}
          ${PULSES.map(([a]) => `<rect class="c-dseq-pulse on" x="${msX(a)}" y="${TRACK.top}" height="${TRACK.base - TRACK.top}" rx="3" />`).join('')}
          <line class="c-dseq-head" y1="${TRACK.top - 8}" y2="${TRACK.base + 8}" />
        </svg>
      </div>
      <div class="c-dseq-motor" style="position:absolute">${vibration('motor')}</div>`,
    bounds: [SERIAL.x, PLOT.y, PLOT.x + PLOT.w, SERIAL.y + SERIAL.h],
  },
  activity: [{ wires: ['w-SDA', 'w-SCL'], at: BUS }],
  run(t, view) {
    const { buzzing, shown, since, playing } = sequenceState(t);
    view.part<Haptic>('HAP1').vibrating = buzzing;

    const hap = view.box('HAP1');
    const motor = view.q<HTMLElement>('.c-dseq-motor');
    motor.style.left = `${hap.x + MOTOR.dx}px`;
    motor.style.top = `${hap.y + MOTOR.dy}px`;
    setVibration(view, 'motor', buzzing ? 1 : 0);

    // The blue fill advances with the playhead through each pulse.
    view.qa<SVGRectElement>('.c-dseq-pulse.on').forEach((p, i) => {
      const [a, b] = PULSES[i];
      p.setAttribute('width', String(msX(clamp(shown, a, b)) - msX(a)));
    });
    const head = view.q<SVGLineElement>('.c-dseq-head');
    head.setAttribute('x1', String(msX(clamp(since, 0, SEQ_MS))));
    head.setAttribute('x2', String(msX(clamp(since, 0, SEQ_MS))));
    head.style.opacity = playing ? '1' : '0';

    showSerial(view, 'out', t, PRINTS, { board: 'arduino-mega' });
  },
};

export default cell;

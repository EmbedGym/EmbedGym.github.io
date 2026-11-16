import { clamp, sinceLast } from '../../anim';
import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial, type Print } from '../../kit';
import { setVibration, vibration } from '../../decor/vibration';

type Haptic = HTMLElement & { vibrating: boolean };

// The sketch writes GO every 1000 ms and prints "Click" right after; the model plays effect 1 for 100 ms.
export const DURATION = 4000;
export const CLICKS = [500, 1500, 2500, 3500];
export const BUZZ_MS = 100;
const LOOP_PRINTS: Print[] = CLICKS.map((t) => ({ t: t + 2, text: 'Click' }));
// The previous loop's lines are already on screen at t=0, matching the end state.
export const PRINTS: Print[] = [...LOOP_PRINTS.map((p) => ({ ...p, t: p.t - DURATION })), ...LOOP_PRINTS];

const SERIAL = { x: -276, y: USB.mega.y - 78, w: 246, h: 112 };
const STRIP = { x: 6, y: -146, w: 236, h: 96 };
export const TRACK = { x: 16, w: 204, y: 76 };
// A scrolling 3 s window: the playhead stays put and the clicks slide past it.
const WINDOW = 3000;
export const HEAD_X = TRACK.x + TRACK.w * 0.62;
export const PULSES = 4;

/** Pulse `i` of the scrolling strip at `t`: its centre x, its opacity and whether it has played. */
export function stripPulse(t: number, i: number) {
  // Clicks fall at 500 + 1000 n ms; draw those inside the window, left of the head already played.
  const first = Math.ceil((t - 0.62 * WINDOW - 500) / 1000);
  const at = 500 + 1000 * (first + i);
  const x = HEAD_X + ((at - t) * TRACK.w) / WINDOW;
  // Fade in and out over the last 24 px at each end of the track.
  const edge = Math.min(x - TRACK.x - 5, TRACK.x + TRACK.w - 5 - x);
  return { x, opacity: clamp(edge / 24), played: at <= t };
}

/** The arcs' level: full at GO, the outer arcs going first as the click dies away, gone when the effect ends. */
export const clickLevel = (since: number) => (since < BUZZ_MS ? 1 - 0.7 * clamp(since / BUZZ_MS) : 0);

// Vibration arcs either side of the motor disc, centred on it.
const MOTOR = { dx: 48, dy: 20 };

const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-dc-panel {
          position: absolute; left: ${STRIP.x}px; top: ${STRIP.y}px; width: ${STRIP.w}px; height: ${STRIP.h}px;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08); font-family: var(--sans);
        }
        .c-dc-title { position: absolute; left: 16px; top: 10px; font-size: 24px; font-weight: 700; color: var(--ink); }
        .c-dc-base { stroke: #cfd6df; stroke-width: 3; }
        .c-dc-pulse { fill: #cfd6df; }
        .c-dc-pulse.on { fill: var(--accent); }
        .c-dc-head { stroke: var(--warn); stroke-width: 3; }
      </style>
      ${serialPanel('out', SERIAL, { note: '115200', cableTo: USB.mega })}
      <div class="c-dc-panel">
        <div class="c-dc-title">effect 1, every 1 s</div>
        <svg width="${STRIP.w}" height="${STRIP.h}" style="position:absolute;left:0;top:0">
          <line class="c-dc-base" x1="${TRACK.x}" x2="${TRACK.x + TRACK.w}" y1="${TRACK.y}" y2="${TRACK.y}" />
          ${'<rect class="c-dc-pulse" width="10" height="26" rx="2" />'.repeat(PULSES)}
          <line class="c-dc-head" x1="${HEAD_X}" x2="${HEAD_X}" y1="${TRACK.y - 34}" y2="${TRACK.y + 8}" />
        </svg>
      </div>
      <div class="c-dc-motor" style="position:absolute">${vibration('motor')}</div>`,
    bounds: [SERIAL.x, STRIP.y, STRIP.x + STRIP.w, SERIAL.y + SERIAL.h],
  },
  activity: [{ wires: ['w-SDA', 'w-SCL'], at: CLICKS }],
  run(t, view) {
    const since = sinceLast(t, CLICKS);
    const buzzing = since < BUZZ_MS;
    view.part<Haptic>('HAP1').vibrating = buzzing;

    const hap = view.box('HAP1');
    const motor = view.q<HTMLElement>('.c-dc-motor');
    motor.style.left = `${hap.x + MOTOR.dx}px`;
    motor.style.top = `${hap.y + MOTOR.dy}px`;
    setVibration(view, 'motor', clickLevel(since));

    view.qa<SVGRectElement>('.c-dc-pulse').forEach((p, i) => {
      const { x, opacity, played } = stripPulse(t, i);
      p.setAttribute('x', String(x - 5));
      p.setAttribute('y', String(TRACK.y - 26));
      p.style.opacity = String(opacity);
      p.classList.toggle('on', played);
    });

    showSerial(view, 'out', t, PRINTS, { board: 'arduino-mega' });
  },
};

export default cell;

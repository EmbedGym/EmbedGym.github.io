import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial, type Print } from '../../kit';
import { setVibration, vibration } from '../../decor/vibration';

type Haptic = HTMLElement & { vibrating: boolean };

// One sketch cycle takes 14 s (ten effects 1.1 s apart, then a 3 s rest).
// Times below are sketch milliseconds from a simulated run: "Playing effect k"
// at PLAY[k-1], the model's 100 ms effect, "Effect k done in N ms", 1 s pause;
// "Cycle complete" at 11529; effect 1 again at 14529. The loop shows each
// effect in real time and runs the waits between them faster.
const CYCLE = 14015;
const SKETCH_T0 = 264;
export const DURATION = 5600;
const PLAY = [514, 1615, 2717, 3818, 4920, 6022, 7123, 8225, 9326, 10428];
const TOOK = [100, 102, 102, 101, 100, 101, 102, 101, 100, 101];
const COMPLETE = 11529;
export const EFFECT_MS = 100;

/**
 * Maps one sketch cycle onto the loop: 1x from each GO until its "done" line
 * (`took` + 1 ms later), the waits between run faster. `t0` is the sketch time
 * shown at loop t = 0; `cycle` later the sketch is back there.
 */
export function browserClock(play: number[], took: number[], t0: number, cycle: number) {
  const playing = play.reduce((sum, _, i) => sum + took[i] + 1, 0);
  const waitSpeed = (cycle - playing) / (DURATION - playing);
  // [sketch ms, loop ms] knots.
  const knots: [number, number][] = [[t0, 0]];
  for (const [i, p] of play.entries()) {
    const [s0, l0] = knots[knots.length - 1];
    const lStart = l0 + (p - s0) / waitSpeed;
    knots.push([p, lStart], [p + took[i] + 1, lStart + took[i] + 1]);
  }
  knots.push([t0 + cycle, DURATION]);
  const lerpKnots = (x: number, from: 0 | 1) => {
    const to = 1 - from;
    for (let i = 1; i < knots.length; i++) {
      const [a, b] = [knots[i - 1], knots[i]];
      if (x <= b[from]) return a[to] + ((x - a[from]) * (b[to] - a[to])) / (b[from] - a[from]);
    }
    throw new Error(`time ${x} outside the cycle`);
  };
  return {
    waitSpeed,
    toLoop: (sketchMs: number) => lerpKnots(sketchMs, 0),
    toSketch: (loopMs: number) => lerpKnots(loopMs, 1),
  };
}

/** The effect playing at sketch time `sketch` (-1 before effect 1), how many have started, and whether the motor runs. */
export function browserState(play: number[], sketch: number) {
  const started = play.filter((p) => p <= sketch).length;
  const current = started - 1;
  const buzzing = current >= 0 && sketch - play[current] < EFFECT_MS;
  return { started, current, buzzing };
}

/** The loop's prints, the previous loop's already on screen at t=0 to match the end state. */
export function loopPrints(loop: Print[]): Print[] {
  return [...loop.map((p) => ({ ...p, t: p.t - DURATION })), ...loop];
}

const { waitSpeed: WAIT_SPEED, toLoop, toSketch } = browserClock(PLAY, TOOK, SKETCH_T0, CYCLE);
const PRINTS = loopPrints([
  ...PLAY.flatMap((p, i) => [
    { t: toLoop(p), text: `Playing effect ${i + 1}` },
    { t: toLoop(p + TOOK[i] + 1), text: `Effect ${i + 1} done in ${TOOK[i]} ms` },
  ]),
  { t: toLoop(COMPLETE), text: 'Cycle complete' },
]);

const SERIAL = { x: -300, y: USB.mega.y - 78, w: 278, h: 180 };
const CHIPS = { x: -44, y: -170, w: 290, h: 136 };
export const CHIP = { x0: 16, y0: 48, w: 46, h: 36, gap: 6 };

const MOTOR = { dx: 48, dy: 20 };

function chips() {
  return PLAY.map((_, i) => {
    const x = CHIP.x0 + (i % 5) * (CHIP.w + CHIP.gap);
    const y = CHIP.y0 + Math.floor(i / 5) * (CHIP.h + CHIP.gap);
    return `<div class="c-eb-chip" style="left:${x}px;top:${y}px">${i + 1}</div>`;
  }).join('');
}

const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-eb-panel {
          position: absolute; left: ${CHIPS.x}px; top: ${CHIPS.y}px; width: ${CHIPS.w}px; height: ${CHIPS.h}px;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08); font-family: var(--sans);
        }
        .c-eb-title { position: absolute; left: 16px; right: 16px; top: 8px; display: flex; justify-content: space-between;
          font-size: 26px; font-weight: 700; color: var(--ink); white-space: nowrap; }
        .c-eb-speed { font-family: var(--mono); font-weight: 600; color: var(--muted); }
        .c-eb-chip {
          position: absolute; width: ${CHIP.w}px; height: ${CHIP.h}px; border-radius: 8px; box-sizing: border-box;
          display: flex; align-items: center; justify-content: center;
          font: 700 26px var(--mono); color: var(--muted); background: #eef1f5; border: 1.5px solid #dde3ea;
        }
        .c-eb-chip.done { color: var(--accent); background: #e3edfc; border-color: #c4d8f8; }
        .c-eb-chip.now { color: #fff; background: var(--accent); border-color: var(--accent); }
      </style>
      ${serialPanel('out', SERIAL, { note: '115200', cableTo: USB.mega, wrap: true })}
      <div class="c-eb-panel">
        <div class="c-eb-title"><span>Effect</span><span class="c-eb-speed">waits ${WAIT_SPEED.toFixed(1)}×</span></div>
        ${chips()}
      </div>
      <div class="c-eb-motor" style="position:absolute">${vibration('motor')}</div>`,
    bounds: [SERIAL.x, CHIPS.y, CHIPS.x + CHIPS.w, SERIAL.y + SERIAL.h],
  },
  // Each effect: the sequence writes and GO, then the GO polls until it clears.
  activity: [{ wires: ['w-SDA', 'w-SCL'], at: PLAY.flatMap((p) => [p, p + 50, p + 100].map(toLoop)) }],
  run(t, view) {
    const { started, current, buzzing } = browserState(PLAY, toSketch(t));
    view.part<Haptic>('HAP1').vibrating = buzzing;

    const hap = view.box('HAP1');
    const motor = view.q<HTMLElement>('.c-eb-motor');
    motor.style.left = `${hap.x + MOTOR.dx}px`;
    motor.style.top = `${hap.y + MOTOR.dy}px`;
    setVibration(view, 'motor', buzzing ? 1 : 0);

    // Before effect 1 the previous cycle has finished: every chip shows as done.
    const restingBefore = started === 0;
    view.qa<HTMLElement>('.c-eb-chip').forEach((chip, i) => {
      const isNow = buzzing && i === current;
      chip.classList.toggle('now', isNow);
      chip.classList.toggle('done', !isNow && (restingBefore || i < started));
    });

    showSerial(view, 'out', t, PRINTS, { board: 'arduino-mega' });
  },
};

export default cell;

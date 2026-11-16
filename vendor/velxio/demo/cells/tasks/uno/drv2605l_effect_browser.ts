import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial } from '../../kit';
import { setVibration, vibration } from '../../decor/vibration';
import { CHIP, DURATION, browserClock, browserState, loopPrints } from '../mega/drv2605l_effect_browser';

type Haptic = HTMLElement & { vibrating: boolean };

// The Uno sketch plays effects 1–10: GO, poll GO until it clears, print "Effect k done in N ms",
// wait 1 s; after effect 10 it prints "Cycle complete" and rests 3 s. It prints no "Playing" line.
// The loop shows each effect in real time and runs the waits faster.
const BOARD = 'arduino-uno';
const I2C_WIRES = ['w-SDA', 'w-SCL'];

// From a run.sh serial run: GO times (sketch ms) and the printed durations.
const PLAY = [13, 1114, 2214, 3316, 4416, 5517, 6617, 7717, 8819, 9920];
const TOOK = [100, 100, 101, 99, 100, 100, 100, 101, 100, 100];
const COMPLETE = PLAY[9] + TOOK[9] + 1000;
const CYCLE = COMPLETE + 3000 - PLAY[0];
// The loop opens 250 ms before effect 1, in the previous cycle's 3 s rest.
const { waitSpeed: WAIT_SPEED, toLoop, toSketch } = browserClock(PLAY, TOOK, PLAY[0] - 250, CYCLE);
const PRINTS = loopPrints([
  ...PLAY.map((p, i) => ({ t: toLoop(p + TOOK[i] + 1), text: `Effect ${i + 1} done in ${TOOK[i]} ms` })),
  { t: toLoop(COMPLETE), text: 'Cycle complete' },
]);

// One reading at a time: the line wraps onto two rows.
const SERIAL = { x: -298, y: USB.uno.y - 4, w: 260, h: 112 };
const CHIPS = { x: -298, y: 180, w: 290, h: 136 };
const CHIPS_ZOOM = 1;
// The breakout is turned 270°, so the motor disc is on its left and the arcs go above and below it.
const MOTOR = { dx: 20, dy: 48 };

function chips() {
  return PLAY.map((_, i) => {
    const x = CHIP.x0 + (i % 5) * (CHIP.w + CHIP.gap);
    const y = CHIP.y0 + Math.floor(i / 5) * (CHIP.h + CHIP.gap);
    return `<div class="c-ebu-chip" style="left:${x}px;top:${y}px">${i + 1}</div>`;
  }).join('');
}

const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-ebu-panel {
          position: absolute; background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08); font-family: var(--sans); transform-origin: 0 0;
        }
        .c-ebu-title { position: absolute; left: 16px; right: 16px; top: 8px; display: flex; justify-content: space-between;
          font-size: 26px; font-weight: 700; color: var(--ink); white-space: nowrap; }
        .c-ebu-speed { font-family: var(--mono); font-weight: 600; color: var(--muted); }
        .c-ebu-chip {
          position: absolute; width: ${CHIP.w}px; height: ${CHIP.h}px; border-radius: 8px; box-sizing: border-box;
          display: flex; align-items: center; justify-content: center;
          font: 700 26px var(--mono); color: var(--muted); background: #eef1f5; border: 1.5px solid #dde3ea;
        }
        .c-ebu-chip.done { color: var(--accent); background: #e3edfc; border-color: #c4d8f8; }
        .c-ebu-chip.now { color: #fff; background: var(--accent); border-color: var(--accent); }
      </style>
      ${serialPanel('out', SERIAL, { note: '115200', cableTo: USB.uno, wrap: true })}
      <div class="c-ebu-panel" style="left:${CHIPS.x}px;top:${CHIPS.y}px;width:${CHIPS.w}px;height:${CHIPS.h}px;transform:scale(${CHIPS_ZOOM})">
        <div class="c-ebu-title"><span>Effect</span><span class="c-ebu-speed">waits ${WAIT_SPEED.toFixed(1)}×</span></div>
        ${chips()}
      </div>
      <div class="c-ebu-motor" style="position:absolute;transform:rotate(90deg)">${vibration('motor')}</div>`,
    bounds: [
      Math.min(SERIAL.x, CHIPS.x),
      Math.min(SERIAL.y, CHIPS.y),
      Math.max(SERIAL.x + SERIAL.w, CHIPS.x + CHIPS.w * CHIPS_ZOOM),
      Math.max(SERIAL.y + SERIAL.h, CHIPS.y + CHIPS.h * CHIPS_ZOOM),
    ],
  },
  // Each effect: the sequence writes and GO, then the GO polls until it clears.
  activity: [{ wires: I2C_WIRES, at: PLAY.flatMap((p) => [p, p + 50, p + 100].map(toLoop)) }],
  run(t, view) {
    const { started, current, buzzing } = browserState(PLAY, toSketch(t));
    view.part<Haptic>('HAP1').vibrating = buzzing;

    const hap = view.box('HAP1');
    const motor = view.q<HTMLElement>('.c-ebu-motor');
    motor.style.left = `${hap.x + MOTOR.dx}px`;
    motor.style.top = `${hap.y + MOTOR.dy}px`;
    setVibration(view, 'motor', buzzing ? 1 : 0);

    // Before effect 1 the previous cycle has finished: every chip shows as done.
    const restingBefore = started === 0;
    view.qa<HTMLElement>('.c-ebu-chip').forEach((chip, i) => {
      const isNow = buzzing && i === current;
      chip.classList.toggle('now', isNow);
      chip.classList.toggle('done', !isNow && (restingBefore || i < started));
    });

    showSerial(view, 'out', t, PRINTS, { board: BOARD });
  },
};

export default cell;

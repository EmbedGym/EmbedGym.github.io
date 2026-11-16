import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial } from '../../kit';
import { setVibration, vibration } from '../../decor/vibration';
import { CHIP, DURATION, browserClock, browserState, loopPrints } from '../mega/drv2605l_effect_browser';

type Haptic = HTMLElement & { vibrating: boolean };

// main.c plays effects 1–10: GO, poll GO 1 ms apart until it clears, printf("Effect %d done in %d ms\n"),
// wait 1 s; after effect 10 it prints "Cycle complete" and rests 3 s. It prints no "Playing" line.
// The loop shows each effect in real time and runs the waits faster.
const BOARD = 'esp32-s3';
const I2C_WIRES = ['w-38-SDA', 'w-39-SCL'];

// GO times (sketch ms) and measured times: each effect is the model's 100 ms plus the 1 ms poll step,
// then 1000 ms to the next GO.
const TOOK = Array.from({ length: 10 }, () => 101);
const PLAY = TOOK.map((_, i) => 500 + i * (101 + 1000));
const COMPLETE = PLAY[9] + TOOK[9] + 1000;
const CYCLE = COMPLETE + 3000 - PLAY[0];
// The loop opens 250 ms before effect 1, in the previous cycle's 3 s rest.
const { waitSpeed: WAIT_SPEED, toLoop, toSketch } = browserClock(PLAY, TOOK, PLAY[0] - 250, CYCLE);
const PRINTS = loopPrints([
  ...PLAY.map((p, i) => ({ t: toLoop(p + TOOK[i] + 1), text: `Effect ${i + 1} done in ${TOOK[i]} ms` })),
  { t: toLoop(COMPLETE), text: 'Cycle complete' },
]);

// The board is tall, so the card's scale is low: the panels are drawn larger to stay legible.
// The serial panel sits under the board, right of the socket, one line at a time.
const SERIAL = { x: 44, y: 352, w: 570, h: 96 };
const CHIPS = { x: 160, y: 64, w: 290, h: 136 };
const CHIPS_ZOOM = 1.5;
// The breakout is turned 90°, so the motor disc is on its right and the arcs go above and below it.
const MOTOR = { dx: 91.2, dy: 48 };

function chips() {
  return PLAY.map((_, i) => {
    const x = CHIP.x0 + (i % 5) * (CHIP.w + CHIP.gap);
    const y = CHIP.y0 + Math.floor(i / 5) * (CHIP.h + CHIP.gap);
    return `<div class="c-ebe-chip" style="left:${x}px;top:${y}px">${i + 1}</div>`;
  }).join('');
}

const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-ebe-panel {
          position: absolute; background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08); font-family: var(--sans); transform-origin: 0 0;
        }
        .c-ebe-title { position: absolute; left: 16px; right: 16px; top: 8px; display: flex; justify-content: space-between;
          font-size: 26px; font-weight: 700; color: var(--ink); white-space: nowrap; }
        .c-ebe-speed { font-family: var(--mono); font-weight: 600; color: var(--muted); }
        .c-ebe-chip {
          position: absolute; width: ${CHIP.w}px; height: ${CHIP.h}px; border-radius: 8px; box-sizing: border-box;
          display: flex; align-items: center; justify-content: center;
          font: 700 26px var(--mono); color: var(--muted); background: #eef1f5; border: 1.5px solid #dde3ea;
        }
        .c-ebe-chip.done { color: var(--accent); background: #e3edfc; border-color: #c4d8f8; }
        .c-ebe-chip.now { color: #fff; background: var(--accent); border-color: var(--accent); }
      </style>
      ${serialPanel('out', SERIAL, { note: '115200', cableTo: USB.esp32s3, fontSize: 36 })}
      <div class="c-ebe-panel" style="left:${CHIPS.x}px;top:${CHIPS.y}px;width:${CHIPS.w}px;height:${CHIPS.h}px;transform:scale(${CHIPS_ZOOM})">
        <div class="c-ebe-title"><span>Effect</span><span class="c-ebe-speed">waits ${WAIT_SPEED.toFixed(1)}×</span></div>
        ${chips()}
      </div>
      <div class="c-ebe-motor" style="position:absolute;transform:rotate(90deg)">${vibration('motor')}</div>`,
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
    const motor = view.q<HTMLElement>('.c-ebe-motor');
    motor.style.left = `${hap.x + MOTOR.dx}px`;
    motor.style.top = `${hap.y + MOTOR.dy}px`;
    setVibration(view, 'motor', buzzing ? 1 : 0);

    // Before effect 1 the previous cycle has finished: every chip shows as done.
    const restingBefore = started === 0;
    view.qa<HTMLElement>('.c-ebe-chip').forEach((chip, i) => {
      const isNow = buzzing && i === current;
      chip.classList.toggle('now', isNow);
      chip.classList.toggle('done', !isNow && (restingBefore || i < started));
    });

    showSerial(view, 'out', t, PRINTS, { board: BOARD });
  },
};

export default cell;

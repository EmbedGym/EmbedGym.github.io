import { clamp } from '../../anim';
import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial } from '../../kit';
import { ADJUST, DURATION, FADE_FROM, PRINTS, READS, clockText, secondsAt } from '../mega/ds1307_rtc';

const BOARD = 'arduino-uno';
const I2C_WIRES = ['w-A4-SDA', 'w-A5-SCL'];

// Same sketch as the Mega: the loop starts at reset, setup writes 2026/02/02
// 15:37:00 into the DS1307, which then counts seconds on its own; once a
// second the sketch reads the time registers and prints them at 9600 baud.
// The monitor clears before the next reset.
const SERIAL = { x: -330, y: 40, w: 320, h: 34 + 2 * 25 * 1.36 + 10 };
// Under the board, left of RTC1 and its supply wires.
const CLOCK = { x: -112, y: 220, w: 262, h: 112 };

const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-rtcu-clock {
          position: absolute; left: ${CLOCK.x}px; top: ${CLOCK.y}px; width: ${CLOCK.w}px; height: ${CLOCK.h}px;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08); font-family: var(--sans);
        }
        .c-rtcu-title { position: absolute; left: 16px; top: 6px; font: 600 28px var(--sans); color: var(--muted); }
        .c-rtcu-set {
          position: absolute; right: 12px; top: 8px; padding: 0 8px; border-radius: 8px;
          font: 700 28px/38px var(--sans); color: #fff; background: var(--accent);
        }
        .c-rtcu-time { position: absolute; left: 16px; top: 50px; font: 700 42px var(--mono); color: var(--ink); }
        .c-rtcu-time .c-rtcu-sec { color: var(--accent); }
      </style>
      ${serialPanel('out', SERIAL, { note: '9600', cableTo: USB.uno })}
      <div class="c-rtcu-clock">
        <div class="c-rtcu-title">RTC1 clock</div>
        <div class="c-rtcu-set">set</div>
        <div class="c-rtcu-time"></div>
      </div>`,
    bounds: [SERIAL.x, SERIAL.y, CLOCK.x + CLOCK.w, CLOCK.y + CLOCK.h],
  },
  // rtc.adjust writes the time registers; each print follows a read of them.
  activity: [{ wires: I2C_WIRES, at: [ADJUST, ...READS] }],
  run(t, view) {
    const time = clockText(secondsAt(t));
    const clock = view.q<HTMLElement>('.c-rtcu-time');
    clock.innerHTML = `${time.slice(0, 6)}<span class="c-rtcu-sec">${time.slice(6)}</span>`;
    // Blank until set, and fading with the monitor so the reset back to :00 isn't a jump.
    clock.style.opacity = String(t < ADJUST ? 0 : 1 - clamp((t - FADE_FROM) / 300));
    view.q<HTMLElement>('.c-rtcu-set').style.opacity = String(t < ADJUST ? 0 : 1 - clamp((t - ADJUST - 900) / 300));
    showSerial(view, 'out', t, PRINTS, { board: BOARD, fadeFrom: FADE_FROM });
  },
};

export default cell;

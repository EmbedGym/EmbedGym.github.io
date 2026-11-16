import { clamp } from '../../anim';
import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial } from '../../kit';
import { ADJUST, DURATION, FADE_FROM, PRINTS, READS, clockText, secondsAt } from '../mega/ds1307_rtc';

const BOARD = 'esp32-s3';
const I2C_WIRES = ['w-38-LV1', 'w-HV1-SDA', 'w-39-LV2', 'w-HV2-SCL'];

// The loop starts at reset: app_main writes 2026/02/02 15:37:00 into the
// DS1307's registers, which then counts seconds on its own. Once a second
// (vTaskDelay) it reads the seven registers back through LS1 and prints the
// date and time. The monitor clears before the next reset.
// The console socket is at the board's bottom end, so the monitor sits under it
// and the card is as tall as the board: text is set large to stay legible.
const FONT = 42;
const SERIAL = { x: -12, y: 376, w: 540, h: 34 + 2 * FONT * 1.36 + 10 };
// Right of RTC1 and its ground wire.
const CLOCK = { x: 352, y: -20, w: 400, h: 170 };

const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-rtce-clock {
          position: absolute; left: ${CLOCK.x}px; top: ${CLOCK.y}px; width: ${CLOCK.w}px; height: ${CLOCK.h}px;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08); font-family: var(--sans);
        }
        .c-rtce-title { position: absolute; left: 22px; top: 10px; font: 600 42px var(--sans); color: var(--muted); }
        .c-rtce-set {
          position: absolute; right: 18px; top: 12px; padding: 0 12px; border-radius: 10px;
          font: 700 42px/56px var(--sans); color: #fff; background: var(--accent);
        }
        .c-rtce-time { position: absolute; left: 22px; top: 76px; font: 700 64px var(--mono); color: var(--ink); }
        .c-rtce-time .c-rtce-sec { color: var(--accent); }
      </style>
      ${serialPanel('out', SERIAL, { note: '115200', cableTo: USB.esp32s3, fontSize: FONT })}
      <div class="c-rtce-clock">
        <div class="c-rtce-title">RTC1 clock</div>
        <div class="c-rtce-set">set</div>
        <div class="c-rtce-time"></div>
      </div>`,
    bounds: [SERIAL.x, CLOCK.y, CLOCK.x + CLOCK.w, SERIAL.y + SERIAL.h],
  },
  // The adjust writes the time registers; each print follows a read of them.
  activity: [{ wires: I2C_WIRES, at: [ADJUST, ...READS] }],
  run(t, view) {
    const time = clockText(secondsAt(t));
    const clock = view.q<HTMLElement>('.c-rtce-time');
    clock.innerHTML = `${time.slice(0, 6)}<span class="c-rtce-sec">${time.slice(6)}</span>`;
    // Blank until set, and fading with the monitor so the reset back to :00 isn't a jump.
    clock.style.opacity = String(t < ADJUST ? 0 : 1 - clamp((t - FADE_FROM) / 300));
    view.q<HTMLElement>('.c-rtce-set').style.opacity = String(t < ADJUST ? 0 : 1 - clamp((t - ADJUST - 900) / 300));
    showSerial(view, 'out', t, PRINTS, { board: BOARD, fadeFrom: FADE_FROM });
  },
};

export default cell;

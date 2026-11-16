import { clamp } from '../../anim';
import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial } from '../../kit';
import { ADJUST, DURATION, FADE_FROM, PRINTS, READS, clockText, secondsAt } from '../mega/ds1307_rtc';

const BOARD = 'nrf52840-dk';
const I2C_WIRES = ['w-P0.21-LV1', 'w-HV1-SDA', 'w-P0.27-LV2', 'w-HV2-SCL'];

// The loop starts at reset: main() writes 2026/02/02 15:37:00 into the
// DS1307's registers, which then counts seconds on its own. Once a second
// (k_msleep(1000)) it burst-reads the seven registers through LS1 and prints
// the date and time. The monitor clears before the next reset.
const FONT = 32;
// Left of RTC1, and under it left of the supply wires, spanning the USB socket.
const CLOCK = { x: -545, y: -40, w: 300, h: 132 };
const SERIAL = { x: -545, y: 102, w: 405, h: 34 + 2 * FONT * 1.36 + 10 };

const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-rtcn-clock {
          position: absolute; left: ${CLOCK.x}px; top: ${CLOCK.y}px; width: ${CLOCK.w}px; height: ${CLOCK.h}px;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08); font-family: var(--sans);
        }
        .c-rtcn-title { position: absolute; left: 16px; top: 8px; font: 600 ${FONT}px var(--sans); color: var(--muted); }
        .c-rtcn-set {
          position: absolute; right: 12px; top: 10px; padding: 0 8px; border-radius: 8px;
          font: 700 ${FONT}px/42px var(--sans); color: #fff; background: var(--accent);
        }
        .c-rtcn-time { position: absolute; left: 16px; top: 62px; font: 700 50px var(--mono); color: var(--ink); }
        .c-rtcn-time .c-rtcn-sec { color: var(--accent); }
      </style>
      ${serialPanel('out', SERIAL, { note: '115200', cableTo: USB.nrf52840, fontSize: FONT })}
      <div class="c-rtcn-clock">
        <div class="c-rtcn-title">RTC1 clock</div>
        <div class="c-rtcn-set">set</div>
        <div class="c-rtcn-time"></div>
      </div>`,
    bounds: [CLOCK.x, CLOCK.y, SERIAL.x + SERIAL.w, SERIAL.y + SERIAL.h],
  },
  // The register write sets the time; each print follows a read of the registers.
  activity: [{ wires: I2C_WIRES, at: [ADJUST, ...READS] }],
  run(t, view) {
    const time = clockText(secondsAt(t));
    const clock = view.q<HTMLElement>('.c-rtcn-time');
    clock.innerHTML = `${time.slice(0, 6)}<span class="c-rtcn-sec">${time.slice(6)}</span>`;
    // Blank until set, and fading with the monitor so the reset back to :00 isn't a jump.
    clock.style.opacity = String(t < ADJUST ? 0 : 1 - clamp((t - FADE_FROM) / 300));
    view.q<HTMLElement>('.c-rtcn-set').style.opacity = String(t < ADJUST ? 0 : 1 - clamp((t - ADJUST - 900) / 300));
    showSerial(view, 'out', t, PRINTS, { board: BOARD, fadeFrom: FADE_FROM });
  },
};

export default cell;

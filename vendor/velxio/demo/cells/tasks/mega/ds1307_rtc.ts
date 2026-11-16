import { clamp } from '../../anim';
import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial, type Print } from '../../kit';

// The loop starts at reset: setup writes 2026/02/02 15:37:00 into the DS1307,
// which then counts seconds on its own. Once a second the sketch reads the
// seven time registers and prints the date and time. The monitor clears
// before the next reset.
export const DURATION = 6000;
export const ADJUST = 40;
export const FADE_FROM = 5600;
export const READS = [0, 1, 2, 3, 4, 5].map((k) => ADJUST + 20 + 1000 * k);
export const secondsAt = (t: number) => (t < ADJUST ? 0 : Math.floor((t - ADJUST) / 1000));
export const clockText = (s: number) => `15:37:${String(s).padStart(2, '0')}`;
export const PRINTS: Print[] = READS.map((r) => ({ t: r + 2, text: `2026/02/02 ${clockText(secondsAt(r))}` }));

const CLOCK = { x: -262, y: -146, w: 230, h: 112 };
const SERIAL = { x: -352, y: -24, w: 320, h: 180 };

const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-rtc-clock {
          position: absolute; left: ${CLOCK.x}px; top: ${CLOCK.y}px; width: ${CLOCK.w}px; height: ${CLOCK.h}px;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08); font-family: var(--sans);
        }
        .c-rtc-title { position: absolute; left: 16px; top: 6px; font: 600 28px var(--sans); color: var(--muted); }
        .c-rtc-set {
          position: absolute; right: 12px; top: 8px; padding: 0 8px; border-radius: 8px;
          font: 700 28px/38px var(--sans); color: #fff; background: var(--accent);
        }
        .c-rtc-time { position: absolute; left: 16px; top: 50px; font: 700 42px var(--mono); color: var(--ink); }
        .c-rtc-time .c-rtc-sec { color: var(--accent); }
      </style>
      ${serialPanel('out', SERIAL, { note: '9600', cableTo: USB.mega })}
      <div class="c-rtc-clock">
        <div class="c-rtc-title">DS1307</div>
        <div class="c-rtc-set">set</div>
        <div class="c-rtc-time"></div>
      </div>`,
    bounds: [SERIAL.x, CLOCK.y, CLOCK.x + CLOCK.w, SERIAL.y + SERIAL.h],
  },
  // rtc.adjust writes the time registers; each print follows a read of them.
  activity: [{ wires: ['w-20-SDA', 'w-21-SCL'], at: [ADJUST, ...READS] }],
  run(t, view) {
    const time = clockText(secondsAt(t));
    const clock = view.q<HTMLElement>('.c-rtc-time');
    clock.innerHTML = `${time.slice(0, 6)}<span class="c-rtc-sec">${time.slice(6)}</span>`;
    // Blank until set, and fading with the monitor so the reset back to :00 isn't a jump.
    clock.style.opacity = String(t < ADJUST ? 0 : 1 - clamp((t - FADE_FROM) / 300));
    view.q<HTMLElement>('.c-rtc-set').style.opacity = String(t < ADJUST ? 0 : 1 - clamp((t - ADJUST - 900) / 300));
    showSerial(view, 'out', t, PRINTS, { board: 'arduino-mega', fadeFrom: FADE_FROM });
  },
};

export default cell;

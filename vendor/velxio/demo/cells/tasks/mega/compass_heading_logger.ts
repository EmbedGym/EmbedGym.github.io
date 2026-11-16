import { clamp, easeInOutCubic } from '../../anim';
import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial, type Print } from '../../kit';
import { BLUE } from '../../decor/common';
import { dial, setDial } from '../../decor/dial';

// Every 5 s the sketch reads the DS1307's time and the compass and logs both;
// the first log after :00 or :30 adds the heading turned since start. The loop
// shows two logs 5 s apart at 2x: the board turns from 45° to 90° between
// them, so the :00 log reports 45° turned. It then turns back for the next loop
// while the monitor clears.
export const DURATION = 6000;
export const LOG_A = 400;
export const LOG_B = 2900;
const TURN = { at: 1200, ms: 600 };
export const BACK = { at: 5300, ms: 500 };
export const FADE_FROM = 5300;
export const FROM = 45;
export const TO = 90;

export function headingAt(t: number) {
  const out = easeInOutCubic(clamp((t - TURN.at) / TURN.ms));
  const back = easeInOutCubic(clamp((t - BACK.at) / BACK.ms));
  return FROM + (TO - FROM) * (out - back);
}

export const PRINTS: Print[] = [
  { t: LOG_A + 2, text: '2026/03/14 09:26:55 Heading: 45.0 Dir: NE' },
  { t: LOG_B + 2, text: '2026/03/14 09:27:00 Heading: 90.0 Dir: E' },
  { t: LOG_B + 4, text: 'Total turned: 45.0 deg' },
];

const SERIAL = { x: -495, y: 39, w: 445, h: 44 + 5 * 29 * 1.36 };
const PANEL = { x: -250, y: -123, w: 124, h: 148 };
const DIAL = { cx: 62, cy: 64, scale: 1.15 };

const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-cl-panel {
          position: absolute; left: ${PANEL.x}px; top: ${PANEL.y}px; width: ${PANEL.w}px; height: ${PANEL.h}px;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08); font-family: var(--sans);
        }
        .c-cl-sum { font: 700 30px var(--mono); fill: ${BLUE}; }
      </style>
      ${serialPanel('out', SERIAL, { note: '115200', cableTo: USB.mega, wrap: true, fontSize: 29 })}
      <div class="c-cl-panel">
        <svg width="${PANEL.w}" height="${PANEL.h}" style="position:absolute;left:0;top:0">
          <text class="c-cl-sum" x="${PANEL.w / 2}" y="${PANEL.h - 8}" text-anchor="middle">+45°</text>
        </svg>
        <div style="position:absolute;left:${DIAL.cx}px;top:${DIAL.cy}px">${dial('heading', { pointer: 'needle', scale: DIAL.scale })}</div>
      </div>`,
    bounds: [SERIAL.x, PANEL.y, SERIAL.x + SERIAL.w, SERIAL.y + SERIAL.h],
  },
  // Each log reads the RTC's seven time registers, then the compass's six data bytes.
  activity: [
    { wires: ['w-20-RTC1-SDA', 'w-21-RTC1-SCL'], at: [LOG_A - 4, LOG_B - 4] },
    { wires: ['w-20-MAG1-SDA', 'w-21-MAG1-SCL'], at: [LOG_A - 1, LOG_B - 1] },
  ],
  run(t, view) {
    // The turned arc and its sum show from the :00 log and fade as the board turns back.
    const summed = t >= LOG_B + 4 ? 1 - clamp((t - BACK.at) / 300) : 0;
    setDial(view, 'heading', { angle: headingAt(t), turned: { from: FROM, to: TO, opacity: summed } });
    view.q<SVGTextElement>('.c-cl-sum').style.opacity = String(summed);
    showSerial(view, 'out', t, PRINTS, { board: 'arduino-mega', fadeFrom: FADE_FROM });
  },
};

export default cell;

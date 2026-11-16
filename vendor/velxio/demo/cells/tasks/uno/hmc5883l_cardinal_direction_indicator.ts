import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial, type Print } from '../../kit';
import { RED } from '../../decor/common';
import { dial, setDial } from '../../decor/dial';
import { DURATION, READS, alignedAt, directionOf, fieldAt, headingAt } from '../mega/hmc5883l_cardinal_direction_indicator';
import { headingOf } from './hmc5883l_compass_heading';

type Led = HTMLElement & { value: boolean };

const BOARD = 'arduino-uno';
const I2C_WIRES = ['w-SDA', 'w-SCL'];
const LED_WIRES = ['w-3-R1', 'w-R1-L1'];

// The breadboard is turned 60 degrees between readings and held still while
// the sketch reads. Once a second (delay(1000)) the sketch reads X/Y, sets
// pin 3's LED while the heading is within 10 degrees of north, then prints
// heading, 8-point direction and alignment; the 43-byte line takes 45 ms at 9600 baud.
export interface Reading {
  t: number;
  heading: number;
  aligned: boolean;
}
export function readingsAt(reads: number[]): Reading[] {
  return [...reads.map((r) => r - DURATION), ...reads].map((r) => {
    const heading = headingOf(fieldAt(((r % DURATION) + DURATION) % DURATION));
    return { t: r, heading, aligned: alignedAt(heading) };
  });
}
export const printsOf = (readings: Reading[], printMs: number): Print[] =>
  readings.map((r) => ({
    t: r.t + printMs,
    text: `Heading: ${r.heading.toFixed(1)} Direction: ${directionOf(r.heading)} Aligned: ${r.aligned ? 'yes' : 'no'}`,
  }));
const READINGS = readingsAt(READS);
// The previous loop's lines are already on screen at t=0, matching the end state.
const PRINTS = printsOf(READINGS, 45);

// The LED above the top header and MAG1 below the bottom one make the card tall,
// so text is set a little larger.
const FONT = 27;
const SERIAL = { x: -345, y: 30, w: 300, h: 34 + 3 * FONT * 1.36 + 10 };
const PANEL = { x: -555, y: 34, w: 200, h: 262 };
const DIAL = { cx: 100, cy: 118, scale: 1.6 };

const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-cdu-panel {
          position: absolute; left: ${PANEL.x}px; top: ${PANEL.y}px; width: ${PANEL.w}px; height: ${PANEL.h}px;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08); font-family: var(--sans);
        }
        .c-cdu-label { position: absolute; left: 0; right: 0; top: 6px; text-align: center; font-size: 28px; font-weight: 700; color: var(--ink); white-space: nowrap; }
        .c-cdu-val { position: absolute; left: 44px; font: 700 28px var(--mono); color: ${RED}; white-space: pre; }
      </style>
      ${serialPanel('out', SERIAL, { note: '9600', cableTo: USB.uno, wrap: true, fontSize: FONT })}
      <div class="c-cdu-panel">
        <div class="c-cdu-label">MAG1 field</div>
        <div style="position:absolute;left:${DIAL.cx}px;top:${DIAL.cy}px">${dial('field', { pointer: 'vector', scale: DIAL.scale })}</div>
        <div class="c-cdu-val" style="top:190px"></div>
        <div class="c-cdu-val" style="top:222px"></div>
      </div>`,
    bounds: [PANEL.x, SERIAL.y, SERIAL.x + SERIAL.w, PANEL.y + PANEL.h],
  },
  activity: [{ wires: I2C_WIRES, at: READS }],
  run(t, view) {
    setDial(view, 'field', { angle: headingAt(t) });
    const field = fieldAt(t);
    const [xv, yv] = view.qa<HTMLElement>('.c-cdu-val');
    xv.textContent = `X ${String(field.x).padStart(4)}`;
    yv.textContent = `Y ${String(field.y).padStart(4)}`;

    // The LED follows the last reading, including the previous loop's last one.
    const done = READINGS.filter((r) => r.t <= t);
    const latest = done[done.length - 1];
    view.part<Led>('L1').value = latest.aligned;
    if (latest.aligned) for (const id of LED_WIRES) view.glowWire(id, 1);

    showSerial(view, 'out', t, PRINTS, { board: BOARD });
  },
};

export default cell;

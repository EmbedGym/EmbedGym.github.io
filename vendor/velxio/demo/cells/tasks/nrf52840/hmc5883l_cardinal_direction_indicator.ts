import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial } from '../../kit';
import { RED } from '../../decor/common';
import { dial, setDial } from '../../decor/dial';
import { DURATION, READS, alignedAt, fieldAt, headingAt } from '../mega/hmc5883l_cardinal_direction_indicator';
import { headingOf } from '../uno/hmc5883l_compass_heading';
import { printsOf, readingsAt } from '../uno/hmc5883l_cardinal_direction_indicator';

type Led = HTMLElement & { value: boolean };

const BOARD = 'nrf52840-dk';
const I2C_WIRES = ['w-P0.21-SDA', 'w-P0.27-SCL'];
const LED_WIRES = ['w-P1.15-R1', 'w-R1-L1'];

// The breadboard is turned 60 degrees between prints and held still while the
// firmware prints. main() polls the heading every 100 ms (k_sleep to an absolute
// time), sets P1.15's LED on every poll while within 10 degrees of north, and
// prints heading, direction and alignment on every 10th poll. The loop is a 6 s
// window starting half a second before a print.
const POLL_MS = 100;
const POLLS = Array.from({ length: DURATION / POLL_MS }, (_, k) => k * POLL_MS);
const ledAt = (t: number) => alignedAt(headingOf(fieldAt(Math.floor(t / POLL_MS) * POLL_MS)));
// The previous loop's lines are already on screen at t=0, matching the end state.
const PRINTS = printsOf(readingsAt(READS), 2);

// The LED stack above the top header makes the card tall, so text is set large
// and a print wraps onto three rows.
const FONT = 31;
const SERIAL = { x: -410, y: 86, w: 360, h: 34 + 3 * FONT * 1.36 + 10 };
// Above the monitor, left of MAG1.
const PANEL = { x: SERIAL.x, y: -140, w: 290, h: 218 };
const DIAL = { cx: 82, cy: 132, scale: 1.85 };

const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-cdn-panel {
          position: absolute; left: ${PANEL.x}px; top: ${PANEL.y}px; width: ${PANEL.w}px; height: ${PANEL.h}px;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08); font-family: var(--sans);
        }
        .c-cdn-label { position: absolute; left: 0; right: 0; top: 6px; text-align: center; font-size: ${FONT}px; font-weight: 700; color: var(--ink); white-space: nowrap; }
        .c-cdn-val { position: absolute; left: 168px; font: 700 ${FONT}px var(--mono); color: ${RED}; white-space: pre; }
      </style>
      ${serialPanel('out', SERIAL, { note: '115200', cableTo: USB.nrf52840, wrap: true, fontSize: FONT })}
      <div class="c-cdn-panel">
        <div class="c-cdn-label">MAG1 field</div>
        <div style="position:absolute;left:${DIAL.cx}px;top:${DIAL.cy}px">${dial('field', { pointer: 'vector', scale: DIAL.scale })}</div>
        <div class="c-cdn-val" style="top:82px"></div>
        <div class="c-cdn-val" style="top:136px"></div>
      </div>`,
    bounds: [SERIAL.x, PANEL.y, SERIAL.x + SERIAL.w, SERIAL.y + SERIAL.h],
  },
  activity: [{ wires: I2C_WIRES, at: POLLS }],
  run(t, view) {
    setDial(view, 'field', { angle: headingAt(t) });
    const field = fieldAt(t);
    const [xv, yv] = view.qa<HTMLElement>('.c-cdn-val');
    xv.textContent = `X ${String(field.x).padStart(4)}`;
    yv.textContent = `Y ${String(field.y).padStart(4)}`;

    const aligned = ledAt(t);
    view.part<Led>('L1').value = aligned;
    if (aligned) for (const id of LED_WIRES) view.glowWire(id, 1);

    showSerial(view, 'out', t, PRINTS, { board: BOARD });
  },
};

export default cell;

import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial } from '../../kit';
import { RED } from '../../decor/common';
import { dial, setDial } from '../../decor/dial';
import { DURATION, READS, alignedAt, fieldAt, headingAt } from '../mega/hmc5883l_cardinal_direction_indicator';
import { headingOf } from '../uno/hmc5883l_compass_heading';
import { printsOf, readingsAt } from '../uno/hmc5883l_cardinal_direction_indicator';

type Led = HTMLElement & { value: boolean };

const BOARD = 'esp32-s3';
const I2C_WIRES = ['w-38-SDA', 'w-39-SCL'];
const LED_WIRES = ['w-10-R1', 'w-R1-L1'];

// The breadboard is turned 60 degrees between prints and held still while the
// sketch prints. app_main polls the heading every 100 ms (vTaskDelayUntil),
// sets GPIO 10's LED on every poll while within 10 degrees of north, and prints
// heading, direction and alignment on every 10th poll. The loop is a 6 s window
// starting half a second before a print.
const POLL_MS = 100;
const POLLS = Array.from({ length: DURATION / POLL_MS }, (_, k) => k * POLL_MS);
const ledAt = (t: number) => alignedAt(headingOf(fieldAt(Math.floor(t / POLL_MS) * POLL_MS)));
// The previous loop's lines are already on screen at t=0, matching the end state.
const PRINTS = printsOf(readingsAt(READS), 2);

// The console socket is at the board's bottom end, so the monitor sits under it
// and the card is as tall as the board: text is set large to stay legible.
const FONT = 40;
const SERIAL = { x: -12, y: 376, w: 1010, h: 34 + 2 * FONT * 1.36 + 10 };
// Right of MAG1, centred on it.
const PANEL = { x: 236, y: 40, w: 440, h: 204 };
const DIAL = { cx: 102, cy: 102, scale: 2.25 };

const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-cde-panel {
          position: absolute; left: ${PANEL.x}px; top: ${PANEL.y}px; width: ${PANEL.w}px; height: ${PANEL.h}px;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08); font-family: var(--sans);
        }
        .c-cde-label { position: absolute; left: 214px; top: 14px; font-size: ${FONT}px; font-weight: 700; color: var(--ink); white-space: nowrap; }
        .c-cde-val { position: absolute; left: 214px; font: 700 ${FONT}px var(--mono); color: ${RED}; white-space: pre; }
      </style>
      ${serialPanel('out', SERIAL, { note: '115200', cableTo: USB.esp32s3, fontSize: FONT })}
      <div class="c-cde-panel">
        <div style="position:absolute;left:${DIAL.cx}px;top:${DIAL.cy}px">${dial('field', { pointer: 'vector', scale: DIAL.scale })}</div>
        <div class="c-cde-label">MAG1 field</div>
        <div class="c-cde-val" style="top:76px"></div>
        <div class="c-cde-val" style="top:132px"></div>
      </div>`,
    bounds: [SERIAL.x, PANEL.y, SERIAL.x + SERIAL.w, SERIAL.y + SERIAL.h],
  },
  activity: [{ wires: I2C_WIRES, at: POLLS }],
  run(t, view) {
    setDial(view, 'field', { angle: headingAt(t) });
    const field = fieldAt(t);
    const [xv, yv] = view.qa<HTMLElement>('.c-cde-val');
    xv.textContent = `X ${String(field.x).padStart(4)}`;
    yv.textContent = `Y ${String(field.y).padStart(4)}`;

    const aligned = ledAt(t);
    view.part<Led>('L1').value = aligned;
    if (aligned) for (const id of LED_WIRES) view.glowWire(id, 1);

    showSerial(view, 'out', t, PRINTS, { board: BOARD });
  },
};

export default cell;

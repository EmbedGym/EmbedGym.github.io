import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial, type Print } from '../../kit';
import { RED } from '../../decor/common';
import { dial, setDial } from '../../decor/dial';
import { DURATION, READS, fieldAt, headingAt } from '../mega/hmc5883l_compass_heading';
import { headingOf } from '../uno/hmc5883l_compass_heading';

const BOARD = 'nrf52840-dk';
const I2C_WIRES = ['w-P0.21-SDA', 'w-P0.27-SCL'];

// The breadboard is turned slowly through a full circle. main() reads X/Y on
// every whole second (k_sleep to an absolute time) and prints atan2(Y, X) of
// the counts as 0..360 degrees; the loop is a 6 s window starting half a second
// before a read.
const LOOP_PRINTS: Print[] = READS.map((t) => ({ t: t + 2, text: `Heading: ${headingOf(fieldAt(t)).toFixed(1)}` }));
// The previous loop's lines are already on screen at t=0, matching the end state.
const PRINTS: Print[] = [...LOOP_PRINTS.map((p) => ({ ...p, t: p.t - DURATION })), ...LOOP_PRINTS];

// Left of the board, under MAG1 and left of its supply wires.
const SERIAL = { x: -314, y: 58, w: 270, h: 112 };
const PANEL = { x: SERIAL.x, y: 180, w: SERIAL.w, h: 120 };
const DIAL = { cx: 66, cy: 60, scale: 1.35 };

const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-chn-panel {
          position: absolute; left: ${PANEL.x}px; top: ${PANEL.y}px; width: ${PANEL.w}px; height: ${PANEL.h}px;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08); font-family: var(--sans);
        }
        .c-chn-label { position: absolute; left: 138px; top: 10px; font-size: 24px; font-weight: 700; color: var(--ink); white-space: nowrap; }
        .c-chn-val { position: absolute; left: 138px; font: 700 26px var(--mono); color: ${RED}; white-space: pre; }
      </style>
      ${serialPanel('out', SERIAL, { note: '115200', cableTo: USB.nrf52840 })}
      <div class="c-chn-panel">
        <div style="position:absolute;left:${DIAL.cx}px;top:${DIAL.cy}px">${dial('field', { pointer: 'vector', scale: DIAL.scale })}</div>
        <div class="c-chn-label">MAG1 field</div>
        <div class="c-chn-val" style="top:44px"></div>
        <div class="c-chn-val" style="top:78px"></div>
      </div>`,
    bounds: [SERIAL.x, SERIAL.y, SERIAL.x + SERIAL.w, PANEL.y + PANEL.h],
  },
  activity: [{ wires: I2C_WIRES, at: READS }],
  run(t, view) {
    // Turning the board turns the field in the sensor's X/Y frame (Y drawn up).
    setDial(view, 'field', { angle: headingAt(t) });
    const field = fieldAt(t);
    const [xv, yv] = view.qa<HTMLElement>('.c-chn-val');
    xv.textContent = `X ${String(field.x).padStart(4)}`;
    yv.textContent = `Y ${String(field.y).padStart(4)}`;
    showSerial(view, 'out', t, PRINTS, { board: BOARD });
  },
};

export default cell;

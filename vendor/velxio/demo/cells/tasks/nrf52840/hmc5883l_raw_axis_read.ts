import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial } from '../../kit';
import { RED } from '../../decor/common';
import { dial, setDial } from '../../decor/dial';
import { DURATION, READS, fieldAt, headingAt } from '../mega/hmc5883l_raw_axis_read';
import { rawPrints } from '../uno/hmc5883l_raw_axis_read';

const BOARD = 'nrf52840-dk';
const I2C_WIRES = ['w-P0.21-SDA', 'w-P0.27-SCL'];

// The breadboard is turned slowly through a full circle, kept flat. main()
// reads the three axes every second (k_sleep to absolute times 1000 ms apart)
// and printk's `X: %d Y: %d Z: %d` at 115200; the loop is a 6 s window
// starting half a second before a read.
const PRINTS = rawPrints(2);

// Left of the board, under MAG1 and left of its supply wires.
const SERIAL = { x: -404, y: 58, w: 360, h: 34 + 2 * 25 * 1.36 + 10 };
const PANEL = { x: SERIAL.x + SERIAL.w - 350, y: SERIAL.y + SERIAL.h + 10, w: 350, h: 158 };
const DIAL = { cx: 76, cy: 80, scale: 1.5 };

const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-ran-panel {
          position: absolute; left: ${PANEL.x}px; top: ${PANEL.y}px; width: ${PANEL.w}px; height: ${PANEL.h}px;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08); font-family: var(--sans);
        }
        .c-ran-val { position: absolute; left: 154px; font: 700 26px var(--mono); color: ${RED}; white-space: pre; }
        .c-ran-val.z { color: var(--muted); }
        .c-ran-title { position: absolute; left: 154px; top: 6px; font: 700 25px var(--sans); color: var(--muted); white-space: nowrap; }
      </style>
      ${serialPanel('out', SERIAL, { note: '115200', cableTo: USB.nrf52840 })}
      <div class="c-ran-panel">
        <div class="c-ran-title">field → MAG1</div>
        <div style="position:absolute;left:${DIAL.cx}px;top:${DIAL.cy}px">${dial('field', { pointer: 'vector', scale: DIAL.scale })}</div>
        <div class="c-ran-val" style="top:42px"></div>
        <div class="c-ran-val" style="top:76px"></div>
        <div class="c-ran-val z" style="top:110px"></div>
      </div>`,
    bounds: [SERIAL.x, SERIAL.y, SERIAL.x + SERIAL.w, PANEL.y + PANEL.h],
  },
  activity: [{ wires: I2C_WIRES, at: READS }],
  run(t, view) {
    // Turning the board turns the field in the sensor's X/Y frame (Y drawn up).
    setDial(view, 'field', { angle: headingAt(t) });
    const field = fieldAt(t);
    const [xv, yv, zv] = view.qa<HTMLElement>('.c-ran-val');
    xv.textContent = `X ${String(field.x).padStart(4)}`;
    yv.textContent = `Y ${String(field.y).padStart(4)}`;
    zv.textContent = `Z ${String(field.z).padStart(4)}`;
    showSerial(view, 'out', t, PRINTS, { board: BOARD });
  },
};

export default cell;

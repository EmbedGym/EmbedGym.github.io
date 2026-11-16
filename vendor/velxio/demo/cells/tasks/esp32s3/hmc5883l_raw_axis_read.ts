import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial } from '../../kit';
import { RED } from '../../decor/common';
import { dial, setDial } from '../../decor/dial';
import { DURATION, READS, fieldAt, headingAt } from '../mega/hmc5883l_raw_axis_read';
import { rawPrints } from '../uno/hmc5883l_raw_axis_read';

const BOARD = 'esp32-s3';
const I2C_WIRES = ['w-38-SDA', 'w-39-SCL'];

// The breadboard is turned slowly through a full circle, kept flat. app_main
// reads the three axes every second (vTaskDelayUntil, 1000 ms) and prints
// `X: %d Y: %d Z: %d` at 115200; the loop is a 6 s window starting half a
// second before a read.
const PRINTS = rawPrints(2);

// The console socket is at the board's bottom end, so the monitor sits under it
// and the card is as tall as the board: text is set large to stay legible.
const FONT = 40;
const SERIAL = { x: -12, y: 376, w: 560, h: 34 + 2 * FONT * 1.36 + 10 };
// Right of MAG1, centred on it.
const PANEL = { x: 236, y: 0, w: 420, h: 284 };
const DIAL = { cx: 106, cy: 166, scale: 2.25 };

const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-rae-panel {
          position: absolute; left: ${PANEL.x}px; top: ${PANEL.y}px; width: ${PANEL.w}px; height: ${PANEL.h}px;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08); font-family: var(--sans);
        }
        .c-rae-val { position: absolute; left: 224px; font: 700 ${FONT}px var(--mono); color: ${RED}; white-space: pre; }
        .c-rae-val.z { color: var(--muted); }
        .c-rae-title { position: absolute; left: 18px; top: 6px; font: 700 ${FONT}px var(--sans); color: var(--muted); white-space: nowrap; }
      </style>
      ${serialPanel('out', SERIAL, { note: '115200', cableTo: USB.esp32s3, fontSize: FONT })}
      <div class="c-rae-panel">
        <div class="c-rae-title">field → MAG1</div>
        <div style="position:absolute;left:${DIAL.cx}px;top:${DIAL.cy}px">${dial('field', { pointer: 'vector', scale: DIAL.scale })}</div>
        <div class="c-rae-val" style="top:76px"></div>
        <div class="c-rae-val" style="top:136px"></div>
        <div class="c-rae-val z" style="top:196px"></div>
      </div>`,
    bounds: [SERIAL.x, PANEL.y, PANEL.x + PANEL.w, SERIAL.y + SERIAL.h],
  },
  activity: [{ wires: I2C_WIRES, at: READS }],
  run(t, view) {
    // Turning the board turns the field in the sensor's X/Y frame (Y drawn up).
    setDial(view, 'field', { angle: headingAt(t) });
    const field = fieldAt(t);
    const [xv, yv, zv] = view.qa<HTMLElement>('.c-rae-val');
    xv.textContent = `X ${String(field.x).padStart(4)}`;
    yv.textContent = `Y ${String(field.y).padStart(4)}`;
    zv.textContent = `Z ${String(field.z).padStart(4)}`;
    showSerial(view, 'out', t, PRINTS, { board: BOARD });
  },
};

export default cell;

import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial, type Print } from '../../kit';
import { RED } from '../../decor/common';
import { dial, setDial } from '../../decor/dial';
import { DURATION, READS, fieldAt, headingAt } from '../mega/hmc5883l_raw_axis_read';

const BOARD = 'arduino-uno';
const I2C_WIRES = ['w-SDA', 'w-SCL'];

// The breadboard is turned slowly through a full circle, kept flat. The sketch
// reads the three axes, prints the raw counts at 9600 baud (a ~22-byte line
// takes ~23 ms) and waits delay(1000), so it reads about once a second.
export const rawPrints = (printMs: number): Print[] => {
  const loop = READS.map((t) => {
    const f = fieldAt(t);
    return { t: t + printMs, text: `X: ${f.x} Y: ${f.y} Z: ${f.z}` };
  });
  // The previous loop's lines are already on screen at t=0, matching the end state.
  return [...loop.map((p) => ({ ...p, t: p.t - DURATION })), ...loop];
};
const PRINTS = rawPrints(23);

const SERIAL = { x: -345, y: 46, w: 305, h: 34 + 2 * 21 * 1.36 + 10 };
const PANEL = { x: SERIAL.x, y: SERIAL.y + SERIAL.h + 10, w: 250, h: 146 };
const DIAL = { cx: 62, cy: 92, scale: 1.2 };

const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-rau-panel {
          position: absolute; left: ${PANEL.x}px; top: ${PANEL.y}px; width: ${PANEL.w}px; height: ${PANEL.h}px;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08); font-family: var(--sans);
        }
        .c-rau-val { position: absolute; left: 128px; font: 700 26px var(--mono); color: ${RED}; white-space: pre; }
        .c-rau-val.z { color: var(--muted); }
        .c-rau-title { position: absolute; left: 14px; top: 4px; font: 700 24px var(--sans); color: var(--muted); white-space: nowrap; }
      </style>
      ${serialPanel('out', SERIAL, { note: '9600', cableTo: USB.uno, fontSize: 21 })}
      <div class="c-rau-panel">
        <div class="c-rau-title">field → MAG1</div>
        <div style="position:absolute;left:${DIAL.cx}px;top:${DIAL.cy}px">${dial('field', { pointer: 'vector', scale: DIAL.scale })}</div>
        <div class="c-rau-val" style="top:44px"></div>
        <div class="c-rau-val" style="top:76px"></div>
        <div class="c-rau-val z" style="top:108px"></div>
      </div>`,
    bounds: [SERIAL.x, SERIAL.y, SERIAL.x + SERIAL.w, PANEL.y + PANEL.h],
  },
  activity: [{ wires: I2C_WIRES, at: READS }],
  run(t, view) {
    // Turning the board turns the field in the sensor's X/Y frame (Y drawn up).
    setDial(view, 'field', { angle: headingAt(t) });
    const field = fieldAt(t);
    const [xv, yv, zv] = view.qa<HTMLElement>('.c-rau-val');
    xv.textContent = `X ${String(field.x).padStart(4)}`;
    yv.textContent = `Y ${String(field.y).padStart(4)}`;
    zv.textContent = `Z ${String(field.z).padStart(4)}`;
    showSerial(view, 'out', t, PRINTS, { board: BOARD });
  },
};

export default cell;

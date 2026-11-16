import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial, type Print } from '../../kit';
import { RED } from '../../decor/common';
import { dial, setDial } from '../../decor/dial';
import { DURATION, fieldAt, headingAt } from '../mega/hmc5883l_compass_heading';

const BOARD = 'arduino-uno';
const I2C_WIRES = ['w-SDA', 'w-SCL'];

// The breadboard is turned slowly through a full circle. The sketch reads X/Y
// 200 ms after reset and then every second (delay(1000)), printing
// atan2(Y, X) of the read counts as 0..360 degrees; a 16-byte line takes 17 ms
// at 9600 baud.
const READS = [200, 1200, 2200, 3200, 4200, 5200];
export const headingOf = (f: { x: number; y: number }) => {
  const h = (Math.atan2(f.y, f.x) * 180) / Math.PI;
  return h < 0 ? h + 360 : h;
};
const LOOP_PRINTS: Print[] = READS.map((t) => ({ t: t + 17, text: `Heading: ${headingOf(fieldAt(t)).toFixed(1)}` }));
// The previous loop's lines are already on screen at t=0, matching the end state.
const PRINTS: Print[] = [...LOOP_PRINTS.map((p) => ({ ...p, t: p.t - DURATION })), ...LOOP_PRINTS];

const SERIAL = { x: -284, y: 46, w: 244, h: 112 };
const PANEL = { x: SERIAL.x, y: 172, w: SERIAL.w, h: 108 };
const DIAL = { cx: 60, cy: 54 };

const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-chu-panel {
          position: absolute; left: ${PANEL.x}px; top: ${PANEL.y}px; width: ${PANEL.w}px; height: ${PANEL.h}px;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08); font-family: var(--sans);
        }
        .c-chu-label { position: absolute; left: 122px; top: 8px; font-size: 22px; font-weight: 700; color: var(--ink); white-space: nowrap; }
        .c-chu-val { position: absolute; left: 122px; font: 700 26px var(--mono); color: ${RED}; white-space: pre; }
      </style>
      ${serialPanel('out', SERIAL, { note: '9600', cableTo: USB.uno })}
      <div class="c-chu-panel">
        <div style="position:absolute;left:${DIAL.cx}px;top:${DIAL.cy}px">${dial('field', { pointer: 'vector', scale: 1.1 })}</div>
        <div class="c-chu-label">MAG1 field</div>
        <div class="c-chu-val" style="top:40px"></div>
        <div class="c-chu-val" style="top:72px"></div>
      </div>`,
    bounds: [SERIAL.x, SERIAL.y, SERIAL.x + SERIAL.w, PANEL.y + PANEL.h],
  },
  activity: [{ wires: I2C_WIRES, at: READS }],
  run(t, view) {
    // Turning the board turns the field in the sensor's X/Y frame (Y drawn up).
    setDial(view, 'field', { angle: headingAt(t) });
    const field = fieldAt(t);
    const [xv, yv] = view.qa<HTMLElement>('.c-chu-val');
    xv.textContent = `X ${String(field.x).padStart(4)}`;
    yv.textContent = `Y ${String(field.y).padStart(4)}`;
    showSerial(view, 'out', t, PRINTS, { board: BOARD });
  },
};

export default cell;

import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial, type Print } from '../../kit';
import { RED } from '../../decor/common';
import { dial, setDial } from '../../decor/dial';

// The breadboard is turned slowly through a full circle, kept flat. The sketch
// reads the three axes once a second and prints the raw counts.
export const DURATION = 6000;
const HEADING_AT_0 = 20;
export const headingAt = (t: number) => (HEADING_AT_0 + (360 * t) / DURATION) % 360;
// The Earth's field as the sensor sees it, at 1090 counts per gauss: 0.4 G
// across the X/Y plane and 0.3 G down through the board, which stays flat.
const FIELD_COUNTS = 436;
const Z_COUNTS = 327;
export const fieldAt = (t: number) => {
  const h = (headingAt(t) * Math.PI) / 180;
  return { x: Math.round(FIELD_COUNTS * Math.cos(h)), y: Math.round(FIELD_COUNTS * Math.sin(h)), z: Z_COUNTS };
};

export const READS = [500, 1500, 2500, 3500, 4500, 5500];
const LOOP_PRINTS: Print[] = READS.map((t) => {
  const f = fieldAt(t);
  return { t: t + 3, text: `X: ${f.x} Y: ${f.y} Z: ${f.z}` };
});
// The previous loop's lines are already on screen at t=0, matching the end state.
const PRINTS: Print[] = [...LOOP_PRINTS.map((p) => ({ ...p, t: p.t - DURATION })), ...LOOP_PRINTS];

const SERIAL = { x: -430, y: 39, w: 376, h: 34 + 2 * 26 * 1.36 + 10 };
const PANEL = { x: SERIAL.x + SERIAL.w - 336, y: SERIAL.y + SERIAL.h + 10, w: 336, h: 154 };
const DIAL = { cx: 77, cy: 77, scale: 1.55 };


const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-ra-panel {
          position: absolute; left: ${PANEL.x}px; top: ${PANEL.y}px; width: ${PANEL.w}px; height: ${PANEL.h}px;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08); font-family: var(--sans);
        }
        .c-ra-val { position: absolute; left: 164px; font: 700 26px var(--mono); color: ${RED}; white-space: pre; }
        .c-ra-val.z { color: var(--muted); }
        .c-ra-title { position: absolute; left: 156px; top: 4px; font: 700 26px var(--sans); color: var(--muted); }
      </style>
      ${serialPanel('out', SERIAL, { note: '115200', cableTo: USB.mega, fontSize: 26 })}
      <div class="c-ra-panel">
        <div class="c-ra-title">field → MAG1</div>
        <div style="position:absolute;left:${DIAL.cx}px;top:${DIAL.cy}px">${dial('field', { pointer: 'vector', scale: DIAL.scale })}</div>
        <div class="c-ra-val" style="top:44px"></div>
        <div class="c-ra-val" style="top:78px"></div>
        <div class="c-ra-val z" style="top:112px"></div>
      </div>`,
    bounds: [SERIAL.x, SERIAL.y, SERIAL.x + SERIAL.w, PANEL.y + PANEL.h],
  },
  activity: [{ wires: ['w-SDA', 'w-SCL'], at: READS }],
  run(t, view) {
    // Turning the board turns the field in the sensor's X/Y frame (Y drawn up).
    setDial(view, 'field', { angle: headingAt(t) });
    const field = fieldAt(t);
    const [xv, yv, zv] = view.qa<HTMLElement>('.c-ra-val');
    xv.textContent = `X ${String(field.x).padStart(4)}`;
    yv.textContent = `Y ${String(field.y).padStart(4)}`;
    zv.textContent = `Z ${String(field.z).padStart(4)}`;
    showSerial(view, 'out', t, PRINTS, { board: 'arduino-mega' });
  },
};

export default cell;

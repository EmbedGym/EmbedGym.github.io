import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial, type Print } from '../../kit';
import { RED } from '../../decor/common';
import { dial, setDial } from '../../decor/dial';

// The breadboard is turned slowly through a full circle. The sketch reads X/Y
// once a second and prints atan2(Y, X) as 0..360 degrees.
export const DURATION = 6000;
const HEADING_AT_0 = 20;
export const headingAt = (t: number) => (HEADING_AT_0 + (360 * t) / DURATION) % 360;
export const READS = [500, 1500, 2500, 3500, 4500, 5500];
const LOOP_PRINTS: Print[] = READS.map((t) => ({ t: t + 2, text: `Heading: ${headingAt(t).toFixed(1)}` }));
// The previous loop's lines are already on screen at t=0, matching the end state.
const PRINTS: Print[] = [...LOOP_PRINTS.map((p) => ({ ...p, t: p.t - DURATION })), ...LOOP_PRINTS];

const SERIAL = { x: -300, y: 39, w: 246, h: 112 };
const PANEL = { x: SERIAL.x + SERIAL.w - 260, y: SERIAL.y + SERIAL.h + 12, w: 260, h: 146 };
const DIAL = { cx: 73, cy: 73, scale: 1.45 };

// The Earth's field as the sensor sees it: 0.4 G across the X/Y plane, 1090 counts per gauss.
const FIELD_COUNTS = 436;
export const fieldAt = (t: number) => {
  const h = (headingAt(t) * Math.PI) / 180;
  return { x: Math.round(FIELD_COUNTS * Math.cos(h)), y: Math.round(FIELD_COUNTS * Math.sin(h)) };
};


const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-ch-panel {
          position: absolute; left: ${PANEL.x}px; top: ${PANEL.y}px; width: ${PANEL.w}px; height: ${PANEL.h}px;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08); font-family: var(--sans);
        }
        .c-ch-label { position: absolute; left: 150px; top: 14px; font-size: 24px; font-weight: 700; color: var(--ink); }
        .c-ch-val { position: absolute; left: 150px; font: 700 26px var(--mono); color: ${RED}; white-space: pre; }
      </style>
      ${serialPanel('out', SERIAL, { note: '115200', cableTo: USB.mega })}
      <div class="c-ch-panel">
        <div style="position:absolute;left:${DIAL.cx}px;top:${DIAL.cy}px">${dial('field', { pointer: 'vector', scale: DIAL.scale })}</div>
        <div class="c-ch-label">field</div>
        <div class="c-ch-val" style="top:50px"></div>
        <div class="c-ch-val" style="top:88px"></div>
      </div>`,
    bounds: [SERIAL.x, SERIAL.y, SERIAL.x + SERIAL.w, PANEL.y + PANEL.h],
  },
  activity: [{ wires: ['w-SDA', 'w-SCL'], at: READS }],
  run(t, view) {
    // Turning the board turns the field in the sensor's X/Y frame (Y drawn up).
    setDial(view, 'field', { angle: headingAt(t) });
    const field = fieldAt(t);
    const [xv, yv] = view.qa<HTMLElement>('.c-ch-val');
    xv.textContent = `X ${String(field.x).padStart(4)}`;
    yv.textContent = `Y ${String(field.y).padStart(4)}`;
    showSerial(view, 'out', t, PRINTS, { board: 'arduino-mega' });
  },
};

export default cell;

import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial, type Print } from '../../kit';
import { RED } from '../../decor/common';
import { dial, setDial } from '../../decor/dial';
import { DURATION, READS, fieldAt, headingAt } from '../mega/hmc5883l_compass_heading';
import { headingOf } from '../uno/hmc5883l_compass_heading';

const BOARD = 'esp32-s3';
const I2C_WIRES = ['w-38-SDA', 'w-39-SCL'];

// The breadboard is turned slowly through a full circle. app_main reads X/Y on
// every whole second (vTaskDelayUntil) and prints atan2f(Y, X) of the counts
// as 0..360 degrees; the loop is a 6 s window starting half a second before a read.
const LOOP_PRINTS: Print[] = READS.map((t) => ({ t: t + 2, text: `Heading: ${headingOf(fieldAt(t)).toFixed(1)}` }));
// The previous loop's lines are already on screen at t=0, matching the end state.
const PRINTS: Print[] = [...LOOP_PRINTS.map((p) => ({ ...p, t: p.t - DURATION })), ...LOOP_PRINTS];

// The console socket is at the board's bottom end, so the monitor sits under it
// and the card is as tall as the board: text is set large to stay legible.
const FONT = 40;
const SERIAL = { x: -12, y: 376, w: 364, h: 34 + 2 * FONT * 1.36 + 10 };
// Right of MAG1, centred on it.
const PANEL = { x: 236, y: 40, w: 440, h: 204 };
const DIAL = { cx: 102, cy: 102, scale: 2.25 };

const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-che-panel {
          position: absolute; left: ${PANEL.x}px; top: ${PANEL.y}px; width: ${PANEL.w}px; height: ${PANEL.h}px;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08); font-family: var(--sans);
        }
        .c-che-label { position: absolute; left: 214px; top: 14px; font-size: ${FONT}px; font-weight: 700; color: var(--ink); white-space: nowrap; }
        .c-che-val { position: absolute; left: 214px; font: 700 ${FONT}px var(--mono); color: ${RED}; white-space: pre; }
      </style>
      ${serialPanel('out', SERIAL, { note: '115200', cableTo: USB.esp32s3, fontSize: FONT })}
      <div class="c-che-panel">
        <div style="position:absolute;left:${DIAL.cx}px;top:${DIAL.cy}px">${dial('field', { pointer: 'vector', scale: DIAL.scale })}</div>
        <div class="c-che-label">MAG1 field</div>
        <div class="c-che-val" style="top:76px"></div>
        <div class="c-che-val" style="top:132px"></div>
      </div>`,
    bounds: [SERIAL.x, PANEL.y, PANEL.x + PANEL.w, SERIAL.y + SERIAL.h],
  },
  activity: [{ wires: I2C_WIRES, at: READS }],
  run(t, view) {
    // Turning the board turns the field in the sensor's X/Y frame (Y drawn up).
    setDial(view, 'field', { angle: headingAt(t) });
    const field = fieldAt(t);
    const [xv, yv] = view.qa<HTMLElement>('.c-che-val');
    xv.textContent = `X ${String(field.x).padStart(4)}`;
    yv.textContent = `Y ${String(field.y).padStart(4)}`;
    showSerial(view, 'out', t, PRINTS, { board: BOARD });
  },
};

export default cell;

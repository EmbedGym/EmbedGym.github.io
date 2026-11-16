import { clamp, easeInOutCubic } from '../../anim';
import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial, type Print } from '../../kit';
import { RED } from '../../decor/common';
import { dial, setDial } from '../../decor/dial';

type Led = HTMLElement & { value: boolean };

// The breadboard is turned 60 degrees between readings and held still while
// the sketch reads, so a full circle takes the 6 s loop. Once a second the
// sketch reads X/Y, prints heading, 8-point direction and alignment, and lights
// pin 3's LED while the heading is within 10 degrees of north.
export const DURATION = 6000;
export const READS = [500, 1500, 2500, 3500, 4500, 5500];
const TURNS = READS.map((r) => r - 400);
const TURN_MS = 300;
const HEADING_AT_0 = 355;
export function headingAt(t: number) {
  const turned = TURNS.reduce((sum, start) => sum + easeInOutCubic(clamp((t - start) / TURN_MS)), 0);
  return (HEADING_AT_0 + 60 * turned) % 360;
}
const DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
export const directionOf = (h: number) => DIRECTIONS[Math.floor(((h + 22.5) % 360) / 45)];
export const alignedAt = (h: number) => h <= 10 || h >= 350;

// The Earth's field as the sensor sees it: 0.4 G across the X/Y plane, 1090 counts per gauss.
const FIELD_COUNTS = 436;
export const fieldAt = (t: number) => {
  const h = (headingAt(t) * Math.PI) / 180;
  return { x: Math.round(FIELD_COUNTS * Math.cos(h)), y: Math.round(FIELD_COUNTS * Math.sin(h)) };
};

// Each printed line is 40 characters, so the monitor wraps it onto indented rows.
const READINGS = [...READS.map((r) => r - DURATION), ...READS].map((r) => {
  const h = headingAt(((r % DURATION) + DURATION) % DURATION);
  return { t: r + 3, heading: h, aligned: alignedAt(h) };
});
// The previous loop's lines are already on screen at t=0, matching the end state.
const PRINTS: Print[] = READINGS.map((r) => ({
  t: r.t,
  text: `Heading: ${r.heading.toFixed(1)} Direction: ${directionOf(r.heading)} Aligned: ${r.aligned ? 'yes' : 'no'}`,
}));
const SERIAL = { x: -415, y: -82, w: 290, h: 44 + 3 * 27 * 1.36 };
const PANEL = { x: SERIAL.x, y: SERIAL.y + SERIAL.h + 10, w: 310, h: 160 };
const DIAL = { cx: 80, cy: 80, scale: 1.6 };


const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-cd-panel {
          position: absolute; left: ${PANEL.x}px; top: ${PANEL.y}px; width: ${PANEL.w}px; height: ${PANEL.h}px;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08); font-family: var(--sans);
        }
        .c-cd-label { position: absolute; left: 160px; top: 18px; font-size: 26px; font-weight: 700; color: var(--ink); white-space: nowrap; }
        .c-cd-val { position: absolute; left: 160px; font: 700 26px var(--mono); color: ${RED}; white-space: pre; }
      </style>
      ${serialPanel('out', SERIAL, { note: '115200', cableTo: USB.mega, wrap: true, fontSize: 27 })}
      <div class="c-cd-panel">
        <div style="position:absolute;left:${DIAL.cx}px;top:${DIAL.cy}px">${dial('field', { pointer: 'vector', scale: DIAL.scale })}</div>
        <div class="c-cd-label">MAG1 field</div>
        <div class="c-cd-val" style="top:58px"></div>
        <div class="c-cd-val" style="top:96px"></div>
      </div>`,
    bounds: [SERIAL.x, SERIAL.y, PANEL.x + PANEL.w, PANEL.y + PANEL.h],
  },
  activity: [{ wires: ['w-SDA', 'w-SCL'], at: READS }],
  run(t, view) {
    setDial(view, 'field', { angle: headingAt(t) });
    const field = fieldAt(t);
    const [xv, yv] = view.qa<HTMLElement>('.c-cd-val');
    xv.textContent = `X ${String(field.x).padStart(4)}`;
    yv.textContent = `Y ${String(field.y).padStart(4)}`;

    // The LED follows the last reading, including the previous loop's last one.
    const done = READINGS.filter((r) => r.t <= t);
    const latest = done[done.length - 1];
    view.part<Led>('L1').value = latest.aligned;
    if (latest.aligned) {
      view.glowWire('w-3-R1', 1);
      view.glowWire('w-R1-L1', 1);
    }

    showSerial(view, 'out', t, PRINTS, { board: 'arduino-mega' });
  },
};

export default cell;

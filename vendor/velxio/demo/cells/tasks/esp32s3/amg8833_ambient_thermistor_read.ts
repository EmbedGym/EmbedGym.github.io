import type { Cell } from '../../cell';
import { glow, setGlow } from '../../decor/glow';
import { mug, runMug } from '../../decor/mug';
import { USB, serialPanel, showSerial } from '../../kit';
import { DURATION, PRINTS, READS, present } from '../mega/amg8833_ambient_thermistor_read';

// The ESP-IDF firmware prints the same line once a second at 115200. The mug stands under the turned sensor.
const FONT = 34;
// Beside the board's bottom, its top below the console socket; one reading a row at 34 px: 34 + 46 + 10.
const PANEL = { x: -620, y: 358, w: 600, h: 90 };
const MUG = { x: 187, y: 206 };
const MUG_SCALE = 1.4;
// The mug's heat, between it and the sensor.
const HEAT = { x: 219, y: 196 };

const amg8833AmbientThermistorReadEsp32s3: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('out', PANEL, { note: '115200', cableTo: USB.esp32s3, fontSize: FONT })}
      ${glow('heat', { tone: 'heat', scale: 1.2 })}
      <div style="position:absolute;left:${MUG.x}px;top:${MUG.y}px">${mug('mug', { scale: MUG_SCALE })}</div>`,
    bounds: [PANEL.x, PANEL.y, 267.4, PANEL.y + PANEL.h],
  },
  activity: [{ wires: ['w-38-SDA', 'w-39-SCL'], at: READS }],
  run(t, view) {
    const p = present(t);
    runMug(view, 'mug', t, { away: 1 - p, dx: 60, dy: 0 });
    setGlow(view, 'heat', HEAT, p);
    showSerial(view, 'out', t, PRINTS);
  },
};

export default amg8833AmbientThermistorReadEsp32s3;

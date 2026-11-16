import type { Cell } from '../../cell';
import { glow, setGlow } from '../../decor/glow';
import { mug, runMug } from '../../decor/mug';
import { USB, serialPanel, showSerial } from '../../kit';
import { DURATION, PRINTS, READS, present } from '../mega/amg8833_ambient_thermistor_read';

// The Uno sketch is the Mega's at 9600 baud. The mug stands left of the sensor, under the board.
// A reading wraps onto two rows; two readings: header 34 + 4 x 34 + 10.
const PANEL = { x: -418, y: 0, w: 400, h: 181 };
const MUG = { x: 140, y: 246 };
const MUG_SCALE = 1.4;
// The mug's heat, between it and the sensor.
const HEAT = { x: 214, y: 300 };

const amg8833AmbientThermistorReadUno: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('out', PANEL, { note: '9600', cableTo: USB.uno, wrap: true })}
      ${glow('heat', { tone: 'heat', scale: 1.2 })}
      <div style="position:absolute;left:${MUG.x}px;top:${MUG.y}px">${mug('mug', { scale: MUG_SCALE })}</div>`,
    bounds: [PANEL.x, PANEL.y, 320.4, 336.4],
  },
  activity: [{ wires: ['w-SDA', 'w-SCL'], at: READS }],
  run(t, view) {
    const p = present(t);
    runMug(view, 'mug', t, { away: 1 - p, dx: -60, dy: 0 });
    setGlow(view, 'heat', HEAT, p);
    showSerial(view, 'out', t, PRINTS, { board: 'arduino-uno' });
  },
};

export default amg8833AmbientThermistorReadUno;

import type { Cell } from '../../cell';
import { glow, setGlow } from '../../decor/glow';
import { mug, runMug } from '../../decor/mug';
import { USB, serialPanel, showSerial } from '../../kit';
import { DURATION, PRINTS, READS, present } from '../mega/amg8833_ambient_thermistor_read';

// The Zephyr firmware prints the same line once a second at 115200. The mug stands left of the sensor, above the board.
const FONT = 28;
// One reading a row: header 34 + 2 x 38.1 + 10.
const PANEL = { x: -510, y: 20, w: 490, h: 120 };
const MUG = { x: -130, y: -120 };
const MUG_SCALE = 1.4;
// The mug's heat, between it and the sensor.
const HEAT = { x: -38, y: -70 };

const amg8833AmbientThermistorReadNrf52840: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('out', PANEL, { note: '115200', cableTo: USB.nrf52840, fontSize: FONT })}
      ${glow('heat', { tone: 'heat', scale: 1.2 })}
      <div style="position:absolute;left:${MUG.x}px;top:${MUG.y}px">${mug('mug', { scale: MUG_SCALE })}</div>`,
    bounds: [PANEL.x, MUG.y, 72, PANEL.y + PANEL.h],
  },
  activity: [{ wires: ['w-P0.21-SDA', 'w-P0.27-SCL'], at: READS }],
  run(t, view) {
    const p = present(t);
    runMug(view, 'mug', t, { away: 1 - p, dx: -60, dy: 0 });
    setGlow(view, 'heat', HEAT, p);
    showSerial(view, 'out', t, PRINTS);
  },
};

export default amg8833AmbientThermistorReadNrf52840;

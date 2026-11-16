import { clamp } from '../../anim';
import type { Cell } from '../../cell';
import { lighter, setLighter } from '../../decor/lighter';
import { USB, serialPanel, showSerial } from '../../kit';
import { DURATION, FLAME_OFF, FLAME_ON, PRINTS, ROOM, WARM, sensorTemp } from '../mega/tmp36_read';

// The Uno runs the Mega sketch unchanged: 10-bit A0 against 5 V, 9600 baud, a line every ~523 ms.
const BOARD = 'arduino-uno';
const VOUT_WIRE = 'w-A0-Vout';

const PANEL = { x: -314, y: 8, w: 300, h: 108 };
// Right of the sensor, its flame licking the sensor's flat face.
const NOZZLE = { x: 330, y: 250 };

const tmp36ReadUno: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('t36u', PANEL, { note: '9600', cableTo: USB.uno, fontSize: 23 })}
      <div style="position:absolute;left:${NOZZLE.x}px;top:${NOZZLE.y}px">${lighter('t36u', { kind: 'flame', mirror: true, scale: 0.55, flameScale: 0.9 })}</div>`,
    bounds: [PANEL.x, PANEL.y, NOZZLE.x + 66, NOZZLE.y + 20],
  },
  run(t, view) {
    setLighter(view, 't36u', t, t >= FLAME_ON && t < FLAME_OFF);
    // Vout rises 10 mV per °C; the wire glows brighter as the sensor warms.
    view.glowWire(VOUT_WIRE, clamp((sensorTemp(t) - ROOM) / (WARM - ROOM)));
    showSerial(view, 't36u', t, PRINTS, { board: BOARD });
  },
};

export default tmp36ReadUno;

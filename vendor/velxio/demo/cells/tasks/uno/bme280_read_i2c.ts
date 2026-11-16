import type { Cell } from '../../cell';
import { runSpray, spray } from '../../decor/spray';
import { USB, serialPanel, showSerial } from '../../kit';
import { DURATION, PRINTS, READS, SPRAY } from '../mega/bme280_read_i2c';

// The Uno runs the Mega's sketch on A4/A5 at 9600 baud.
const BUS = ['w-A4-SDA', 'w-A5-SCL'];
// A reading wraps onto three rows; two readings fit.
const PANEL = { x: -265, y: 0, w: 245, h: 249 };
// Under the board, left of the sensor and below the 5V and GND runs.
const BOTTLE = { x: 20, y: 228 };

const bme280ReadI2cUno: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('out', PANEL, { note: '9600', cableTo: USB.uno, wrap: true })}
      ${spray('mister')}`,
    bounds: [PANEL.x, PANEL.y, BOTTLE.x + 64, BOTTLE.y + 100],
  },
  activity: [{ wires: BUS, at: READS }],
  run(t, view) {
    // The mist settles short of the sensor; the nozzle is 62 px into the mister.
    runSpray(view, 'mister', BOTTLE, t, [SPRAY], { reach: view.box('ENV1').x - 18 - (BOTTLE.x + 62) });
    showSerial(view, 'out', t, PRINTS, { board: 'arduino-uno' });
  },
};

export default bme280ReadI2cUno;

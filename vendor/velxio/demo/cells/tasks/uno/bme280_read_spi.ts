import type { Cell } from '../../cell';
import { runSpray, spray } from '../../decor/spray';
import { USB, serialPanel, showSerial } from '../../kit';
import { DURATION, PRINTS, READS, SPRAY } from '../mega/bme280_read_spi';

// The Uno runs the Mega's sketch on its SPI pins 13/12/11/10 at 9600 baud.
const BUS = ['w-13-SCK', 'w-12-MISO', 'w-11-MOSI', 'w-10-CS'];
// A reading wraps onto three rows; two readings fit.
const PANEL = { x: -265, y: -128, w: 245, h: 249 };
// Above the board, right of the sensor, spraying left at it.
const BOTTLE = { x: 240, y: -128 };

const bme280ReadSpiUno: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('out', PANEL, { note: '9600', cableTo: USB.uno, wrap: true })}
      ${spray('mister', { mirror: true })}`,
    // The 5V run under the board's bottom edge sets the card's bottom.
    bounds: [PANEL.x, PANEL.y, BOTTLE.x + 64, PANEL.y + PANEL.h],
  },
  activity: [{ wires: BUS, at: READS }],
  run(t, view) {
    const sensor = view.box('ENV1');
    // Mirrored, the nozzle is 2 px into the mister; the mist settles short of the sensor.
    runSpray(view, 'mister', BOTTLE, t, [SPRAY], { reach: BOTTLE.x + 2 - (sensor.x + sensor.w + 5) });
    showSerial(view, 'out', t, PRINTS, { board: 'arduino-uno' });
  },
};

export default bme280ReadSpiUno;

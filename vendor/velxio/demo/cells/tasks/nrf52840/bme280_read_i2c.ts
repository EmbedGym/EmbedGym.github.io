import type { Cell } from '../../cell';
import { runSpray, spray } from '../../decor/spray';
import { USB, serialPanel, showSerial } from '../../kit';
import { DURATION, PRINTS, READS, SPRAY } from '../mega/bme280_read_i2c';

// The Zephyr firmware reads on P0.21/P0.27 and prints the Mega's line once a second at 115200.
const BUS = ['w-P0.21-SDA', 'w-P0.27-SCL'];
const FONT = 27;
// A reading wraps onto two rows: header 34 + 2 x 36.7 + 10.
const PANEL = { x: -450, y: 10, w: 430, h: 118 };
// Left of the sensor, above the serial panel.
const BOTTLE = { x: -150, y: -120 };

const bme280ReadI2cNrf52840: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('out', PANEL, { note: '115200', cableTo: USB.nrf52840, fontSize: FONT, wrap: true })}
      ${spray('mister')}`,
    bounds: [PANEL.x, BOTTLE.y, BOTTLE.x + 64, PANEL.y + PANEL.h],
  },
  activity: [{ wires: BUS, at: READS }],
  run(t, view) {
    runSpray(view, 'mister', BOTTLE, t, [SPRAY], { reach: view.box('ENV1').x - 18 - (BOTTLE.x + 62) });
    showSerial(view, 'out', t, PRINTS);
  },
};

export default bme280ReadI2cNrf52840;

import type { Cell } from '../../cell';
import { runSpray, spray } from '../../decor/spray';
import { USB, serialPanel, showSerial } from '../../kit';
import { DURATION, PRINTS, READS, SPRAY } from '../mega/bme280_read_i2c';

// The ESP-IDF firmware reads on GPIO38/39 and prints the Mega's line once a second at 115200.
const BUS = ['w-38-SDA', 'w-39-SCL'];
// The card is tall (I2C at the board's top, the console socket at its bottom), so the text is larger.
const FONT = 34;
// Under the board, one row wide enough for the whole line: header 34 + 46 + 10.
const PANEL = { x: -330, y: 372, w: 780, h: 90 };
// Right of the sensor, spraying left at it.
const BOTTLE = { x: 340, y: 100 };

const bme280ReadI2cEsp32s3: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('out', PANEL, { note: '115200', cableTo: USB.esp32s3, fontSize: FONT })}
      ${spray('mister', { mirror: true })}`,
    bounds: [PANEL.x, PANEL.y, BOTTLE.x + 64, PANEL.y + PANEL.h],
  },
  activity: [{ wires: BUS, at: READS }],
  run(t, view) {
    const sensor = view.box('ENV1');
    // Mirrored, the nozzle is 2 px into the mister; the mist settles short of the sensor.
    runSpray(view, 'mister', BOTTLE, t, [SPRAY], { reach: BOTTLE.x + 2 - (sensor.x + sensor.w + 18) });
    showSerial(view, 'out', t, PRINTS);
  },
};

export default bme280ReadI2cEsp32s3;

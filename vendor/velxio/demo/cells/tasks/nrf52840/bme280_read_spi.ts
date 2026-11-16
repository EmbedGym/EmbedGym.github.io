import type { Cell } from '../../cell';
import { runSpray, spray } from '../../decor/spray';
import { USB, serialPanel, showSerial } from '../../kit';
import { DURATION, PRINTS, READS, SPRAY } from '../mega/bme280_read_spi';

// The Zephyr firmware reads over SPI (P0.27 SCK, P0.23 MISO, P0.21 MOSI, P1.14 CS) and prints the Mega's line once a second at 115200.
const BUS = ['w-P0.27-SCK', 'w-P0.23-MISO', 'w-P0.21-MOSI', 'w-P1.14-CS'];
const FONT = 27;
// Two readings, each wrapped onto two rows: header 34 + 4 x 36.7 + 10.
const PANEL = { x: -450, y: 10, w: 430, h: 191 };
// Left of the sensor, above the serial panel.
const BOTTLE = { x: -110, y: -130 };

const bme280ReadSpiNrf52840: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('out', PANEL, { note: '115200', cableTo: USB.nrf52840, fontSize: FONT, wrap: true })}
      ${spray('mister')}`,
    bounds: [PANEL.x, BOTTLE.y, BOTTLE.x + 64, PANEL.y + PANEL.h],
  },
  activity: [{ wires: BUS, at: READS }],
  run(t, view) {
    runSpray(view, 'mister', BOTTLE, t, [SPRAY], { reach: view.box('ENV1').x - 5 - (BOTTLE.x + 62) });
    showSerial(view, 'out', t, PRINTS);
  },
};

export default bme280ReadSpiNrf52840;

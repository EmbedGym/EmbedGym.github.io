import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial } from '../../kit';
import { bottle, DURATION, PRINTS, READS, runBottle } from '../mega/voc_raw';

// The Uno runs the Mega's sketch (A4/A5, 9600 baud), so the readings are the Mega card's.
const BUS = ['w-A4-SDA', 'w-A5-SCL'];
// Two rows: header 34 + 2 x 34 + 10.
const PANEL = { x: -290, y: 2, w: 270, h: 112 };
// Under the board, left of the sensor and clear of the 5V and GND runs.
const BOTTLE = { x: 100, y: 236 };

const vocRawUno: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('out', PANEL, { note: '9600', cableTo: USB.uno })}
      ${bottle('c-vocu', BOTTLE)}`,
    bounds: [PANEL.x, PANEL.y, BOTTLE.x + 54, BOTTLE.y + 76],
  },
  // The measure command goes out 250 ms before each read.
  activity: [{ wires: BUS, at: READS.flatMap((r) => [r - 250, r]) }],
  run(t, view) {
    // The vapour drifts right to the sensor's left edge.
    const sensor = view.box('GAS1');
    runBottle(view, 'c-vocu', BOTTLE, t, { x: sensor.x - 24, y: sensor.y + 30 });
    showSerial(view, 'out', t, PRINTS, { board: 'arduino-uno' });
  },
};

export default vocRawUno;

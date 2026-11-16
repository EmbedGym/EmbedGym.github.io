import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial } from '../../kit';
import { bottle, DURATION, PRINTS, READS, runBottle } from '../mega/voc_raw';

// The ESP-IDF firmware measures on GPIO38/39; like the Arduino library it waits 250 ms for each measurement, then 1 s, so its readings are the Mega card's. 115200 baud.
const BUS = ['w-38-SDA', 'w-39-SCL'];
// The card is tall (I2C at the board's top, the console socket at its bottom), so the text is larger.
const FONT = 34;
// Left of the board's bottom end, its top below the console socket so the cable can turn up into it. One row: header 34 + 46 + 10.
const PANEL = { x: -362, y: 358, w: 342, h: 90 };
// Right of the sensor; the vapour drifts left to it.
const BOTTLE = { x: 290, y: 100 };

const vocRawEsp32s3: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('out', PANEL, { note: '115200', cableTo: USB.esp32s3, fontSize: FONT })}
      ${bottle('c-voce', BOTTLE)}`,
    bounds: [PANEL.x, PANEL.y, BOTTLE.x + 54, PANEL.y + PANEL.h],
  },
  // The measure command goes out 250 ms before each read.
  activity: [{ wires: BUS, at: READS.flatMap((r) => [r - 250, r]) }],
  run(t, view) {
    const sensor = view.box('GAS1');
    runBottle(view, 'c-voce', BOTTLE, t, { x: sensor.x + sensor.w + 24, y: sensor.y + 40 });
    showSerial(view, 'out', t, PRINTS);
  },
};

export default vocRawEsp32s3;

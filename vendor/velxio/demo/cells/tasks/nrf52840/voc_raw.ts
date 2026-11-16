import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial, type Print } from '../../kit';
import { bottle, DURATION, rawAt, runBottle } from '../mega/voc_raw';

// The Zephyr firmware measures on P0.21/P0.27 and prints once a second at 115200.
const BUS = ['w-P0.21-SDA', 'w-P0.27-SCL'];
const READS = [278, 1278, 2278, 3278, 4278];
const LOOP_PRINTS: Print[] = READS.map((t) => ({ t: t + 31, text: `VOC Raw: ${rawAt(t)}` }));
const PRINTS: Print[] = [...LOOP_PRINTS.map((p) => ({ ...p, t: p.t - DURATION })), ...LOOP_PRINTS];
const FONT = 27;
// Two rows: header 34 + 2 x 36.7 + 10.
const PANEL = { x: -303, y: 10, w: 283, h: 118 };
// Left of the sensor, above the serial panel.
const BOTTLE = { x: -130, y: -110 };

const vocRawNrf52840: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('out', PANEL, { note: '115200', cableTo: USB.nrf52840, fontSize: FONT })}
      ${bottle('c-vocn', BOTTLE)}`,
    bounds: [PANEL.x, BOTTLE.y - 16, BOTTLE.x + 54, PANEL.y + PANEL.h],
  },
  // The measure command, then the read 30 ms later.
  activity: [{ wires: BUS, at: READS.flatMap((r) => [r, r + 30]) }],
  run(t, view) {
    const sensor = view.box('GAS1');
    runBottle(view, 'c-vocn', BOTTLE, t, { x: sensor.x - 24, y: sensor.y + 30 });
    showSerial(view, 'out', t, PRINTS);
  },
};

export default vocRawNrf52840;

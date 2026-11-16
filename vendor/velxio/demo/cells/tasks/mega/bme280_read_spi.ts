import type { Cell } from '../../cell';
import { runSpray, spray } from '../../decor/spray';
import { USB, serialPanel, showSerial, type Print } from '../../kit';

// A plant mister sprays a puff of water mist at the BME280. The sketch reads it
// over SPI once a second and prints humidity and temperature: the humidity jumps
// and the evaporating mist cools the air a little, then both drift back.
export const DURATION = 5000;
export const READS = [150, 1150, 2150, 3150, 4150];
const VALUES = [
  ['50.0', '25.0'],
  ['50.0', '25.0'],
  ['68.5', '24.2'],
  ['61.0', '24.6'],
  ['53.5', '24.9'],
];
const LOOP_PRINTS: Print[] = READS.map((t, i) => ({ t: t + 5, text: `Humidity: ${VALUES[i][0]} Temperature: ${VALUES[i][1]} C` }));
// The previous loop's lines are already on screen at t=0, matching the end state.
export const PRINTS: Print[] = [...LOOP_PRINTS.map((p) => ({ ...p, t: p.t - DURATION })), ...LOOP_PRINTS];
const PANEL = { x: -265, y: USB.mega.y - 178, w: 245, h: 249 };

export const SPRAY = 1300;
const BOTTLE = { x: 196, y: -132 };

const bme280ReadSpi: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('out', PANEL, { note: '9600', cableTo: USB.mega, wrap: true })}
      ${spray('mister')}`,
    bounds: [PANEL.x, BOTTLE.y, BOTTLE.x + 64, PANEL.y + PANEL.h],
  },
  activity: [{ wires: ['w-52-SCK', 'w-50-MISO', 'w-51-MOSI', 'w-53-CS'], at: READS }],
  run(t, view) {
    // The mist settles before reaching the sensor's power wire; the nozzle is 62 px into the mister.
    runSpray(view, 'mister', BOTTLE, t, [SPRAY], { reach: view.box('ENV1').x - 18 - (BOTTLE.x + 62) });
    showSerial(view, 'out', t, PRINTS, { board: 'arduino-mega' });
  },
};

export default bme280ReadSpi;

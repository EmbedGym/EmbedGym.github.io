import { USB } from '../../kit';
import { stableReadingCell } from '../mega/sen0244_stable_reading';

// As on the Mega: the module sits below-left of the board, its three wires
// straight into the bottom header; the cup hangs round the probe's prongs.
export default stableReadingCell({
  board: 'arduino-uno',
  usb: USB.uno,
  serial: { x: -342, y: USB.uno.y - 70, w: 320, h: 120 },
  font: 26,
  glass: { x: -78, y: 290 },
  signalWire: 'w-A0-signal',
  ppm: 299,
  // Wet from about 620 ms, so 22 of the 30 samples are wet by the 1500 ms print.
  fill: [450, 800],
});

import { USB } from '../../kit';
import { waterQualityCell } from '../mega/sen0244_water_quality_monitor';

// As on the Mega: the module sits below-left of the board, its three wires
// straight into the bottom header; the cup hangs round the probe's prongs.
export default waterQualityCell({
  board: 'arduino-uno',
  usb: USB.uno,
  serial: { x: -528, y: USB.uno.y - 70, w: 506, h: 120 },
  font: 25,
  glass: { x: -78, y: 290 },
  signalWire: 'w-A0-signal',
  ppm: [88, 219, 389, 692],
});

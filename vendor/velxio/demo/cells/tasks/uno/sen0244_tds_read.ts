import { USB } from '../../kit';
import { tdsReadCell } from '../mega/sen0244_tds_read';

// As on the Mega: the module sits below-left of the board, its three wires
// straight into the bottom header; the cup hangs round the probe's prongs.
export default tdsReadCell({
  board: 'arduino-uno',
  usb: USB.uno,
  serial: { x: -480, y: USB.uno.y - 42, w: 458, h: 84 },
  font: 25,
  glass: { x: -78, y: 290 },
  signalWire: 'w-A0-signal',
  wet: 'Voltage: 0.67 V TDS: 249 ppm',
});

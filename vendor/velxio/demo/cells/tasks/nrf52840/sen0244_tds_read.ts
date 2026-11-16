import { USB } from '../../kit';
import { tdsReadCell } from '../mega/sen0244_tds_read';

// As on the Mega: the module sits below-left of the board, its three wires
// running right under the board and up into the bottom header (VDD, GND, P0.03);
// the cup hangs round the probe's prongs.
export default tdsReadCell({
  board: 'nrf52840-dk',
  usb: USB.nrf52840,
  serial: { x: -560, y: USB.nrf52840.y - 50, w: 538, h: 96 },
  font: 28,
  glass: { x: -50, y: 333.1 },
  signalWire: 'w-P0.03-signal',
  wet: 'Voltage: 0.67 V TDS: 250 ppm',
});

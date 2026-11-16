import { USB } from '../../kit';
import { stableReadingCell } from '../mega/sen0244_stable_reading';

// As in nrf52840/sen0244_tds_read: the module below-left of the board, its
// wires straight up into the bottom header; the panel left of the side socket.
export default stableReadingCell({
  board: 'nrf52840-dk',
  usb: USB.nrf52840,
  serial: { x: -372, y: USB.nrf52840.y - 80, w: 350, h: 136 },
  font: 30,
  glass: { x: -50, y: 333.1 },
  signalWire: 'w-P0.03-signal',
  ppm: 300,
  // Wet from about 620 ms, so 22 of the 30 samples are wet by the 1500 ms print.
  fill: [450, 800],
});

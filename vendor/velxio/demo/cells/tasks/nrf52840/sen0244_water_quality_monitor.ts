import { USB } from '../../kit';
import { waterQualityCell } from '../mega/sen0244_water_quality_monitor';

// As in nrf52840/sen0244_tds_read: the module below-left of the board, its
// wires straight up into the bottom header; the panel left of the side socket.
export default waterQualityCell({
  board: 'nrf52840-dk',
  usb: USB.nrf52840,
  serial: { x: -582, y: USB.nrf52840.y - 80, w: 560, h: 136 },
  font: 29,
  glass: { x: -50, y: 333.1 },
  signalWire: 'w-P0.03-signal',
  ppm: [88, 221, 390, 693],
});

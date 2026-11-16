import { USB } from '../../kit';
import { qualityLedCell } from '../mega/sen0244_quality_led_indicator';

// As on the Mega: the module below-left of the board, its wires straight up
// into the bottom header; the resistor and LED sit just above the top header
// between P1.15 and GND.
export default qualityLedCell({
  board: 'nrf52840-dk',
  usb: USB.nrf52840,
  serial: { x: -642, y: USB.nrf52840.y - 84, w: 620, h: 150 },
  font: 32,
  glass: { x: -50, y: 333.1 },
  signalWire: 'w-P0.03-signal',
  ledWires: ['w-P1.15-R_LED', 'w-R_LED-L1'],
  ppm: [79, 219, 400, 699],
  blinkStartsOn: true,
});

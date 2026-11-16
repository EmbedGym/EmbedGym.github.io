import { USB } from '../../kit';
import { qualityLedCell } from '../mega/sen0244_quality_led_indicator';

// As on the Mega: the module sits below-left of the board, its three wires
// straight into the bottom header; the LED and its resistor sit on the top
// header between pin 12 and GND.
export default qualityLedCell({
  board: 'arduino-uno',
  usb: USB.uno,
  serial: { x: -650, y: USB.uno.y - 120, w: 628, h: 140 },
  font: 31,
  glass: { x: -114, y: 290 },
  signalWire: 'w-A0-signal',
  ledWires: ['w-12-R_LED', 'w-R_LED-L1'],
  ppm: [79, 219, 399, 698],
  blinkStartsOn: false,
});

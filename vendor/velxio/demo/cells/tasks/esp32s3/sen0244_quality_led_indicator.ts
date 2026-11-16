import { USB } from '../../kit';
import { qualityLedCell } from '../mega/sen0244_quality_led_indicator';

// The module sits high on the left with + level with 3V3; A drops to GPIO 9
// and − runs over the board's top to the right header's GND, which leaves the
// left side below free for the resistor and LED on GPIO 10.
export default qualityLedCell({
  board: 'esp32-s3',
  usb: USB.esp32s3,
  serial: { x: 150, y: 120, w: 600, h: 158 },
  font: 32,
  glass: { x: -87, y: 101.5 },
  signalWire: 'w-9-signal',
  ledWires: ['w-10-R_LED', 'w-R_LED-L1'],
  ppm: [79, 219, 399, 700],
  blinkStartsOn: true,
});

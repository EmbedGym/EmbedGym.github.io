import { USB } from '../../kit';
import { singleTouchCell } from '../mega/mpr121_single_touch_detect';

// The MPR121 hangs under the board's bottom header (A4/A5, 5V, GND); the pad
// sits left of it, low enough for the finger to clear the board.
export default singleTouchCell({
  prefix: 'c-mpr1u',
  board: 'arduino-uno',
  usb: USB.uno,
  baud: '9600',
  seen: 20,
  serial: { x: -262, y: 0, w: 222, h: 125 },
  font: 30,
  pad: { x: 80, y: 300, d: 56 },
  padVia: [{ x: 207.6, y: 328 }],
  i2c: ['w-SDA', 'w-SCL'],
});

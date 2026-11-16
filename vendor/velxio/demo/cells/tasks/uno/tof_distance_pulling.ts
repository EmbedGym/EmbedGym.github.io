import { USB } from '../../kit';
import { tofCell } from '../mega/tof_distance_pulling';

// Board-specific names: SDA on A4, SCL on A5; the module hangs upside down, so it looks down.
export default tofCell({
  prefix: 'c-tofu-',
  i2c: ['w-A4-SDA', 'w-A5-SCL'],
  txLed: 'arduino-uno',
  usb: USB.uno,
  panel: { x: -400, y: -4, w: 380, h: 134 },
  baud: '9600',
  font: 34,
  facing: 'down',
  face: 505 - 200,
  axis: 236 - 100,
  right: 300,
});

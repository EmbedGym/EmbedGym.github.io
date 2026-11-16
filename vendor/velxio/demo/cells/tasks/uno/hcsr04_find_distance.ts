import { USB } from '../../kit';
import { hcsr04Cell } from '../mega/hcsr04_find_distance';

export default hcsr04Cell({
  txLed: 'arduino-uno',
  usb: USB.uno,
  panel: { x: -340, y: -4, w: 320, h: 134 },
  prefix: 'c-hcu-',
  trig: ['w-9-TRIG'],
  echo: ['w-10-ECHO'],
  facing: 'down',
  face: 284.5 - 200,
  right: 560,
  font: 30,
  // 23 pings per loop, so the seam keeps the cadence.
  period: 5000 / 23,
});

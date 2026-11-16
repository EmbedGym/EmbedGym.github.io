import { USB } from '../../kit';
import { hcsr04Cell } from '../mega/hcsr04_find_distance';

// Board-specific names: TRIG on P0.05; ECHO through LS1 channel 3 to P0.04.
export default hcsr04Cell({
  usb: USB.nrf52840,
  panel: { x: -290, y: -8, w: 270, h: 256 },
  prefix: 'c-hcn-',
  trig: ['w-P0.05-TRIG'],
  echo: ['w-HV1-ECHO', 'w-P0.04-LV1'],
  facing: 'right',
  face: 784.5 - 60,
  axis: 213.75 - 60,
  right: 724.5,
  font: 39,
  wrap: true,
  // 23 pings per loop, so the seam keeps the cadence.
  period: 5000 / 23,
});

import { USB } from '../../kit';
import { hcsr04Cell } from '../mega/hcsr04_find_distance';

// Board-specific names: TRIG on GPIO43; ECHO through LS1 channel 4 to GPIO44.
export default hcsr04Cell({
  usb: USB.esp32s3,
  panel: { x: 0, y: 376, w: 420, h: 99 },
  prefix: 'c-hce-',
  trig: ['w-43-TRIG'],
  echo: ['w-HV1-ECHO', 'w-44-LV1'],
  facing: 'right',
  face: 404.5 - 60,
  axis: 72.55 - 60,
  right: 344.5,
  font: 40,
  // 23 pings per loop, so the seam keeps the cadence.
  period: 5000 / 23,
});

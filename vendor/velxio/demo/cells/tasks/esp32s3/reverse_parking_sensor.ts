import { reverseCell } from '../mega/reverse_parking_sensor';

// Board-specific names: TRIG GPIO40, ECHO through LS1 channel 4 to GPIO41, buzzer on GPIO11.
export default reverseCell({
  prefix: 'c-rpe-',
  trig: 'w-40-TRIG',
  echo: ['w-HV1-ECHO', 'w-41-LV1'],
  buzzer: 'w-11-BZ1',
  face: 404.5 - 60,
  axis: 72.55 - 60,
  soundDir: 'up',
  panel: { x: -392, y: 40, w: 230 },
  font: 32,
  right: 400,
  bottom: 0,
});

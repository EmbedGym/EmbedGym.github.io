import { duty8, parkingCell } from '../mega/parking_sensor';

// Board-specific names: TRIG GPIO40, ECHO through LS1 channel 4 to GPIO41, LED on GPIO10 through R1, buzzer on GPIO11.
export default parkingCell({
  prefix: 'c-pke-',
  trig: 'w-40-TRIG',
  echo: ['w-HV1-ECHO', 'w-41-LV1'],
  led: ['w-10-R1', 'w-R1-L1'],
  buzzer: 'w-11-BZ1',
  face: 404.5 - 60,
  axis: 72.55 - 60,
  soundDir: 'up',
  panel: { x: -360, y: 40, w: 198, h: 194 },
  font: 32,
  duty: duty8,
  ongoing: true,
  right: 400,
});

import { duty8, parkingCell } from '../mega/parking_sensor';

// Board-specific names: TRIG D9, ECHO D10, LED on D5 through R1, buzzer on D2.
export default parkingCell({
  prefix: 'c-pku-',
  trig: 'w-9-TRIG',
  echo: ['w-10-ECHO'],
  led: ['w-5-R1', 'w-R1-L1'],
  buzzer: 'w-2-BZ1',
  face: 55.5 - 200,
  panel: { x: -262, y: -166, w: 198, h: 194 },
  font: 32,
  duty: duty8,
  ongoing: true,
  right: 380,
});

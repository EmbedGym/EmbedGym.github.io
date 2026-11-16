import { reverseCell } from '../mega/reverse_parking_sensor';

// Board-specific names: TRIG P0.05, ECHO through LS1 channel 3 to P0.04, buzzer on P1.15.
export default reverseCell({
  prefix: 'c-rpn-',
  trig: 'w-P0.05-TRIG',
  echo: ['w-HV1-ECHO', 'w-P0.04-LV1'],
  buzzer: 'w-P1.15-BZ1',
  face: 758.5 - 60,
  axis: 213.75 - 60,
  panel: { x: -278, y: 8, w: 258 },
  font: 37,
  right: 754,
  bottom: 0,
});

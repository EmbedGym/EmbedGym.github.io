import { reverseCell } from '../mega/reverse_parking_sensor';

// Board-specific names: TRIG D9, ECHO D10, buzzer on D3.
export default reverseCell({
  prefix: 'c-rpu-',
  trig: 'w-9-TRIG',
  echo: ['w-10-ECHO'],
  buzzer: 'w-3-BZ1',
  face: 55.5 - 200,
  panel: { x: -306, y: -150, w: 228 },
  font: 32,
  right: 360,
  bottom: 0,
});

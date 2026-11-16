import { parkingCell } from '../mega/parking_sensor';

// Board-specific names: TRIG P0.05, ECHO through LS1 channel 3 to P0.04, LED on P1.12 through R1, buzzer on P1.15.
export default parkingCell({
  prefix: 'c-pkn-',
  trig: 'w-P0.05-TRIG',
  echo: ['w-HV1-ECHO', 'w-P0.04-LV1'],
  led: ['w-P1.12-R1', 'w-R1-L1'],
  buzzer: 'w-P1.15-BZ1',
  face: 758.5 - 60,
  axis: 213.75 - 60,
  soundDir: 'up',
  panel: { x: -256, y: 8, w: 236, h: 226 },
  font: 38,
  // The Zephyr sketch sets the PWM pulse to (100 - d)% of the period.
  duty: (cm) => (100 - cm) / 100,
  ongoing: true,
  right: 754,
});

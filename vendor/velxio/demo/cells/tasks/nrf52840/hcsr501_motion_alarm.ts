import { pirAlarmCell } from '../mega/hcsr501_motion_alarm';

// Board-specific names: PIR OUT on P0.28, buzzer on P1.15; the person walks in from the right of the PIR.
export default pirAlarmCell({
  prefix: 'c-pirn-',
  high: ['w-P0.28-OUT', 'w-P1.15-BZ1'],
  walk: { from: 360, to: 280, feet: 431 - 60 },
  tag: { x: 180, y: -104, w: 104, h: 84 },
  font: 35,
  soundDir: 'left',
});

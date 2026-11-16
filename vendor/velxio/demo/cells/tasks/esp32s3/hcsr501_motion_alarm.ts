import { pirAlarmCell } from '../mega/hcsr501_motion_alarm';

// Board-specific names: PIR OUT on GPIO14, buzzer on GPIO11; the person walks in from the left of the PIR.
export default pirAlarmCell({
  prefix: 'c-pire-',
  high: ['w-PIR-OUT', 'w-11-BZ'],
  walk: { from: -230, to: -120, feet: 522.5 - 60 },
  tag: { x: -190, y: 240, w: 80, h: 70 },
  soundDir: 'left',
  font: 26,
});

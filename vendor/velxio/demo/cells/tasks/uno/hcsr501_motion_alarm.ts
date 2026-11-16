import { pirAlarmCell } from '../mega/hcsr501_motion_alarm';

// Board-specific names: PIR OUT on D2, buzzer on D3; the person walks in from the right of the PIR.
export default pirAlarmCell({
  prefix: 'c-piru-',
  high: ['w-PIR-OUT', 'w-3-BZ'],
  walk: { from: 590 - 100, to: 520 - 100, feet: 170 - 200 },
  tag: { x: 30, y: -110, w: 80, h: 70 },
  font: 26,
});

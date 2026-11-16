import { tiltCell } from '../mega/tilt_detection_alarm';

// Board-specific names: S on P0.04, buzzer on P1.15.
export default tiltCell({
  prefix: 'c-tiltn-',
  s: 'w-P0.04-S',
  buzzer: 'w-P1.15-BZ1',
  arrow: { cx: 232, cy: 294, r: 18 },
  tag: { x: -140, y: 220, w: 126, h: 104 },
  font: 42,
});

import { tiltCell } from '../mega/tilt_detection_alarm';

// Board-specific names: S on GPIO14, buzzer on GPIO13.
export default tiltCell({
  prefix: 'c-tilte-',
  s: 'w-14-S',
  buzzer: 'w-13-BZ',
  arrow: { cx: -194, cy: 8, r: 18 },
  tag: { x: -206, y: 70, w: 100, h: 88 },
  font: 34,
  soundDir: 'up',
});

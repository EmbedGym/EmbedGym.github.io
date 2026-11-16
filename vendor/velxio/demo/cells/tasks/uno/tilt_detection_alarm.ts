import { tiltCell } from '../mega/tilt_detection_alarm';

// Board-specific names: S on D2, buzzer on D13.
export default tiltCell({
  prefix: 'c-tiltu-',
  s: 'w-2-S',
  buzzer: 'w-13-BZ',
  arrow: { cx: 185, cy: -55, r: 18 },
  tag: { x: 296, y: -118, w: 92, h: 80 },
  font: 31,
});

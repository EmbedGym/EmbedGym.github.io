import { USB } from '../../kit';
import { pirMotionCell } from '../mega/sensor_pir_human_motion';

// Board-specific names: PIR OUT on D4; the person walks in from the right of the PIR.
export default pirMotionCell({
  out: 'w-PIR-OUT',
  txLed: 'arduino-uno',
  usb: USB.uno,
  panel: { x: -420, y: -10, w: 400, h: 140 },
  baud: '9600',
  font: 30,
  walk: { from: 560 - 100, to: 520 - 100, feet: 170 - 200 },
});

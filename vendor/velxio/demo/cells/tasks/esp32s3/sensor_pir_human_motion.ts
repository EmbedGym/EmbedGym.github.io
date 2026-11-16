import { USB } from '../../kit';
import { pirMotionCell } from '../mega/sensor_pir_human_motion';

// Board-specific names: PIR OUT on GPIO14; the PIR hangs upside down, so the person walks in from its left.
export default pirMotionCell({
  out: 'w-PIR-OUT',
  usb: USB.esp32s3,
  panel: { x: 60, y: 380, w: 400, h: 120 },
  baud: '115200',
  font: 30,
  walk: { from: -220, to: -130, feet: 522.5 - 60 },
});

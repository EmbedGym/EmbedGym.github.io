import { USB } from '../../kit';
import { pirMotionCell } from '../mega/sensor_pir_human_motion';

// Board-specific names: PIR OUT on P0.28; the person walks in from the right of the PIR.
export default pirMotionCell({
  out: 'w-P0.28-OUT',
  usb: USB.nrf52840,
  panel: { x: -400, y: 50, w: 380, h: 140 },
  baud: '115200',
  font: 30,
  walk: { from: 340, to: 270, feet: 431 - 60 },
});

import { USB } from '../../kit';
import { tofCell } from '../mega/tof_distance_pulling';

// Board-specific names: SDA on GPIO38, SCL on GPIO39; the module is turned to look right.
export default tofCell({
  prefix: 'c-tofe-',
  i2c: ['w-38-SDA', 'w-39-SCL'],
  usb: USB.esp32s3,
  panel: { x: 0, y: 372, w: 420, h: 104 },
  baud: '115200',
  font: 37,
  facing: 'right',
  face: 292 - 60,
  axis: 208.2 - 60,
  right: 300,
});

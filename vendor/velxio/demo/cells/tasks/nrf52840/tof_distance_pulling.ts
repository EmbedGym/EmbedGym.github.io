import { USB } from '../../kit';
import { tofCell } from '../mega/tof_distance_pulling';

// Board-specific names: SDA on P0.21, SCL on P0.27; the module is turned to look left.
export default tofCell({
  prefix: 'c-tofn-',
  i2c: ['w-P0.21-SDA', 'w-P0.27-SCL'],
  usb: USB.nrf52840,
  panel: { x: -386, y: 64, w: 366, h: 134 },
  baud: '115200',
  font: 30,
  facing: 'left',
  face: -27 - 60,
  axis: 16.8 - 60,
  right: 520,
});

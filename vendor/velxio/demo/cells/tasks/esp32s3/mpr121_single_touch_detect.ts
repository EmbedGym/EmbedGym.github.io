import { USB } from '../../kit';
import { singleTouchCell } from '../mega/mpr121_single_touch_detect';

// The MPR121 sits right of the board, high enough for the 3V3 wire to come
// straight over the board's top; the pad hangs off electrode 0. The serial monitor goes under the
// board, whose console socket opens down.
export default singleTouchCell({
  prefix: 'c-mpr1e',
  board: 'esp32-s3',
  usb: USB.esp32s3,
  baud: '115200',
  // Up to one 10 ms poll, the I2C read, then under 1 ms of serial at 115200 baud.
  seen: 12,
  serial: { x: -20, y: 374, w: 320, h: 160 },
  font: 42,
  pad: { x: 340, y: 38.8, d: 56 },
  padPin: 'left',
  padVia: [],
  i2c: ['w-38-SDA', 'w-39-SCL'],
});

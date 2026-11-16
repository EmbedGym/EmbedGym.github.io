import { USB } from '../../kit';
import { singleTouchCell } from '../mega/mpr121_single_touch_detect';

// The MPR121 sits over the top header with SCL straight above P0.27; the pad
// hangs off electrode 0 to its right, above the SDA run, wired in from the left so the finger never hides the wire.
export default singleTouchCell({
  prefix: 'c-mpr1n',
  board: 'nrf52840-dk',
  usb: USB.nrf52840,
  baud: '115200',
  // Up to one 10 ms poll, the I2C read, then under 1 ms of serial at 115200 baud.
  seen: 12,
  serial: { x: -265, y: 60, w: 235, h: 125 },
  font: 30,
  pad: { x: 155, y: -88, d: 56 },
  padPin: 'left',
  padVia: [{ x: 119, y: -112 }, { x: 145, y: -112 }, { x: 145, y: -60 }],
  i2c: ['w-P0.21-SDA', 'w-P0.27-SCL'],
});

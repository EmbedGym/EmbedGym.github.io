import { USB } from '../../kit';
import { fourButtonCell } from '../mega/mpr121_four_button_menu';

// The MPR121 sits over the top header; the pads sit in a row to its right,
// electrode 0's nearest, and each wire rises over the electrode row and drops
// into its pad's left side.
const E_X = [119, 109.4, 99.8, 90.2];
const PAD_Y = -90;
const PAD_XS = [155, 235, 315, 395];
const LEVELS = [-112, -120, -128, -136];
export default fourButtonCell({
  board: 'nrf52840-dk',
  usb: USB.nrf52840,
  baud: '115200',
  // Up to one 10 ms poll, the I2C read, then about 2 ms of serial at 115200 baud.
  seen: 13,
  serial: { x: -410, y: 20, w: 380, h: 220 },
  font: 32,
  pads: PAD_XS.map((x) => ({ x, y: PAD_Y })),
  padPin: 'left',
  vias: PAD_XS.map((x, i) => [
    { x: E_X[i], y: LEVELS[i] },
    { x: x - 12, y: LEVELS[i] },
    { x: x - 12, y: PAD_Y + 28 },
  ]),
  i2c: ['w-P0.21-SDA', 'w-P0.27-SCL'],
  // Short and low, so it hovers under the pad wires that run over the nearer pads.
  finger: { length: 56, lift: 8 },
});

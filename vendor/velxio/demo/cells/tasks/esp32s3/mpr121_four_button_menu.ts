import { USB } from '../../kit';
import { fourButtonCell } from '../mega/mpr121_four_button_menu';

// The MPR121 sits right of the board, its electrode column facing right; the
// pads sit in a row below that side, electrode 0's nearest, and each wire
// steps right and down into its pad's left side.
const E_Y = [66.8, 57.2, 47.6, 38];
const PAD_Y = 110;
const PAD_XS = [350, 430, 510, 590];
export default fourButtonCell({
  board: 'esp32-s3',
  usb: USB.esp32s3,
  baud: '115200',
  // Up to one 10 ms poll, the I2C read, then about 2 ms of serial at 115200 baud.
  seen: 13,
  serial: { x: -40, y: 374, w: 700, h: 185 },
  font: 42,
  pads: PAD_XS.map((x) => ({ x, y: PAD_Y })),
  padPin: 'left',
  vias: PAD_XS.map((x, i) => [
    { x: x - 12, y: E_Y[i] },
    { x: x - 12, y: PAD_Y + 28 },
  ]),
  i2c: ['w-38-SDA', 'w-39-SCL'],
  // From below, where nothing is wired, so the finger never hides a pad wire.
  finger: { rotate: 180 },
});

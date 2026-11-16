import { USB } from '../../kit';
import { fourButtonCell } from '../mega/mpr121_four_button_menu';

// The MPR121 hangs under the board's bottom header, its electrodes facing
// down; the pads sit in a row below it, two each side, and each wire fans out
// and enters its pad's left side, clear of the finger.
const E_X = [207.6, 217.2, 226.8, 236.4];
const PAD_Y = 350;
const PAD_XS = [50, 130, 270, 350];
const LEVELS = [316, 328, 328, 316];
export default fourButtonCell({
  board: 'arduino-uno',
  usb: USB.uno,
  baud: '9600',
  seen: 35,
  serial: { x: -390, y: -40, w: 360, h: 214 },
  font: 32,
  pads: PAD_XS.map((x) => ({ x, y: PAD_Y })),
  padPin: 'left',
  vias: PAD_XS.map((x, i) => [
    { x: E_X[i], y: LEVELS[i] },
    { x: x - 12, y: LEVELS[i] },
    { x: x - 12, y: PAD_Y + 28 },
  ]),
  i2c: ['w-SDA', 'w-SCL'],
});

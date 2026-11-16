import { USB } from '../../kit';
import { passcodeLockCell } from '../mega/mpr121_touch_passcode_lock';

// The relay sits off the board's bottom-left corner: pin 13 and GND.1 come
// round the left edge from the top header, 5V straight across from the bottom
// one. Its load hangs to its left (lock beside it, the 12 V pack under the
// lock). The MPR121 sits under A4/A5 with the pads in a row to its right.
const E_X = [207.6, 217.2, 226.8, 236.4];
const PAD = { d: 48, y: 340 };
const PAD_XS = [256, 320, 384, 448];
const LEVELS = [332, 324, 316, 308];
export default passcodeLockCell({
  prefix: 'c-mprlu',
  board: 'arduino-uno',
  usb: USB.uno,
  baud: '9600',
  lag: 10,
  printMs: 10,
  serial: { x: -300, y: -20, w: 230, h: 150 },
  font: 36,
  lock: { x: -174, y: 248, scale: 1 },
  battery: { x: -114, y: 354 },
  loadVia: { com: [{ x: -20, y: 368 }], no: [{ x: -30, y: 344 }, { x: -82, y: 344 }] },
  pads: PAD_XS.map((x) => ({ x, y: PAD.y })),
  padD: PAD.d,
  padPin: 'left',
  padVias: PAD_XS.map((x, i) => [
    { x: E_X[i], y: LEVELS[i] },
    { x: x - 12, y: LEVELS[i] },
    { x: x - 12, y: PAD.y + PAD.d / 2 },
  ]),
  // Beside pad 0, the keypad it reads out.
  badge: { x: 184, y: 340 },
  i2c: ['w-SDA', 'w-SCL'],
  relayWire: 'w-13',
  // From below, where nothing is wired, so the finger never covers the module or a pad wire.
  finger: { rotate: 180 },
});

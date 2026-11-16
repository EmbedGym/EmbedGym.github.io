import { USB } from '../../kit';
import { passcodeLockCell } from '../mega/mpr121_touch_passcode_lock';

// The MPR121 sits right of the board, high, with the pads in a row under it;
// the relay sits lower down, its control pins facing the board, and its load
// runs out to the right: COM straight into the 12 V pack, the pack's − up into
// the lock above it, NO round under the pack to the lock's other pin. The
// serial monitor goes under the board, whose console socket opens down.
const E_Y = [66.8, 57.2, 47.6, 38];
const PAD = { d: 44, y: 100 };
const PAD_XS = [340, 400, 460, 520];
export default passcodeLockCell({
  prefix: 'c-mprle',
  board: 'esp32-s3',
  usb: USB.esp32s3,
  baud: '115200',
  // Up to one 10 ms poll; a line takes under 1 ms at 115200 baud.
  lag: 10,
  printMs: 1,
  // It sleeps 3 s after UNLOCKED instead of polling.
  sleepsWhileOpen: true,
  serial: { x: -40, y: 368, w: 300, h: 185 },
  font: 44,
  lock: { x: 324, y: 170, scale: 1 },
  battery: { x: 300, y: 260, plus: 'left' },
  loadVia: { no: [{ x: 296, y: 284 }, { x: 296, y: 306 }, { x: 324 + 92, y: 306 }] },
  pads: PAD_XS.map((x) => ({ x, y: PAD.y })),
  padD: PAD.d,
  padPin: 'left',
  padVias: PAD_XS.map((x, i) => [
    { x: x - 12, y: E_Y[i] },
    { x: x - 12, y: PAD.y + PAD.d / 2 },
  ]),
  badge: { x: 460, y: 180 },
  badgeFont: 46,
  i2c: ['w-38-SDA', 'w-39-SCL'],
  relayWire: 'w-21-IN',
  // Short and low, so it hovers under the electrode wires.
  finger: { length: 56, lift: 8 },
});

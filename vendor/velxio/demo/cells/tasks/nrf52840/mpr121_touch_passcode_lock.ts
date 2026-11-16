import { USB } from '../../kit';
import { passcodeLockCell } from '../mega/mpr121_touch_passcode_lock';

// The MPR121 sits over the top header as in the single-touch card, the pads in
// a row to its right. The relay hangs under the bottom header (5V, GND.2), its
// load to its left: lock beside it, the 12 V pack under the lock. P1.15 is on
// the top header, so its wire comes round the board's left edge.
const E_X = [119, 109.4, 99.8, 90.2];
const PAD = { d: 56, y: -96 };
const PAD_XS = [155, 235, 315, 395];
const LEVELS = [-118, -126, -134, -142];
const NO = { x: 170, y: 368 };
export default passcodeLockCell({
  prefix: 'c-mprln',
  board: 'nrf52840-dk',
  usb: USB.nrf52840,
  baud: '115200',
  // Up to one 10 ms poll; a line takes under 1 ms at 115200 baud.
  lag: 10,
  printMs: 1,
  // It sleeps 3 s after UNLOCKED instead of polling.
  sleepsWhileOpen: true,
  serial: { x: -290, y: 30, w: 260, h: 185 },
  font: 44,
  lock: { x: NO.x - 144, y: NO.y - 80, scale: 1 },
  battery: { x: NO.x - 84, y: NO.y + 26 },
  loadVia: {
    com: [{ x: NO.x + 10, y: NO.y + 40 }],
    no: [
      { x: NO.x, y: NO.y + 16 },
      { x: NO.x - 52, y: NO.y + 16 },
    ],
  },
  pads: PAD_XS.map((x) => ({ x, y: PAD.y })),
  padD: PAD.d,
  padPin: 'left',
  padVias: PAD_XS.map((x, i) => [
    { x: E_X[i], y: LEVELS[i] },
    { x: x - 12, y: LEVELS[i] },
    { x: x - 12, y: PAD.y + PAD.d / 2 },
  ]),
  badge: { x: 470, y: -100 },
  badgeFont: 40,
  i2c: ['w-P0.21-SDA', 'w-P0.27-SCL'],
  relayWire: 'w-P1.15-IN',
  // Short and low, so it hovers under the pad wires that run over the nearer pads.
  finger: { length: 56, lift: 8 },
});

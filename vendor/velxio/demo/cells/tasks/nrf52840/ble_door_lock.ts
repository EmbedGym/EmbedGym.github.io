import { clamp } from '../../anim';
import type { Cell, CellView } from '../../cell';
import { batteryPart } from '../../decor/battery';
import { finger, tapFinger } from '../../decor/finger';
import { RED } from '../../decor/common';
import { lockPart, setLock } from '../../decor/lock';
import { phone, phoneHeight, phoneWidth, runPhone, setPhoneLink, type PhoneMessage } from '../../decor/phone';

type Keypad = HTMLElement & { connector: boolean };
type Relay = HTMLElement & { energized: boolean };

// Board-specific names.
const BOARD = 'nrf52840-dk';
const KEYPAD = 'KP1';
const RELAY = 'RLY1';
const ROW_WIRES = ['w-P1.08-R1', 'w-P1.01-R2', 'w-P1.02-R3', 'w-P0.27-R4'];
const COL_WIRES = ['w-P0.21-C1', 'w-P0.23-C2', 'w-P1.14-C3', 'w-P1.13-C4'];
const RELAY_WIRE = 'w-P1.15-IN';
const LOAD_WIRES = ['load-no', 'load-ret', 'load-com'];

// The phone (peer.py) is the central, connected and subscribed to the lock
// state throughout. It writes the wrong PIN 9876, which does nothing. On the
// keypad, 1 2 3 4 # unlocks (notified 1) for 5 s, then the door locks again
// (notified 0). The keypad is scanned every 5 ms and a key counts after 4 scans.
const DURATION = 7700;
const HOLD = 180;
const WRONG = 150;
const KEYS = [
  { key: '1', row: 0, col: 0, down: 500 },
  { key: '2', row: 0, col: 1, down: 800 },
  { key: '3', row: 0, col: 2, down: 1100 },
  { key: '4', row: 1, col: 0, down: 1400 },
  { key: '#', row: 3, col: 2, down: 1700 },
];
const UNLOCK = KEYS[4].down + 20;
const RELOCK = UNLOCK + 5000;
const REPLY = 170;
const FADE_FROM = 7400;

const CHAT: PhoneMessage[] = [
  { t: WRONG, text: 'write 9876', from: 'out' },
  { t: UNLOCK + REPLY, text: 'notify 1', from: 'in' },
  { t: RELOCK + REPLY, text: 'notify 0', from: 'in' },
];

// As on the 16key_keypad card, the keypad is turned 270° (connector right) and the finger
// comes from the lower left on the diagonal through the key corners, its pad on each key's
// lower-left corner, leaving the neighbours' labels clear.
const TAP = { rotate: 225, aim: { x: -13, y: 13 } };

const F = 32;
// Cell coordinates: the relay spans x -124..-36, y 100..148, NO/COM on its left edge at y 114/124.
// The lock sits left of it under the keypad, its leads out of its lower edge at y 180; the
// pack lies under the lock.
const LOCK = { x: -322, y: 100 };
const BATTERY = { x: -322, y: 210 };
const PHONE_W = phoneWidth(10, F);
const PHONE_H = phoneHeight({ fontSize: F, rows: 2 });
// Above the board's right half, right of the keypad lines' last drop (x 345).
const PHONE = { x: 355, y: -10 - PHONE_H, w: PHONE_W, h: PHONE_H };
// Left of the phone, above the keypad lines: the board's verdict on 9876.
const VERDICT = { x: 244, y: PHONE.y + 16 };

function keyEl(view: CellView, key: string) {
  return view.part<Keypad>(KEYPAD).shadowRoot!.querySelector(`[data-key-name="${key}"]`)!;
}

// kit.keypadKey scales by the keypad's own drawing, which the connector lengthens; the board
// is unrotated, so it gives the screen-to-cell scale here.
function keyCentre(view: CellView, key: string) {
  const r = keyEl(view, key).getBoundingClientRect();
  const b = view.part(BOARD).getBoundingClientRect();
  const box = view.box(BOARD);
  const k = box.w / b.width;
  return { x: box.x + (r.left + r.width / 2 - b.left) * k, y: box.y + (r.top + r.height / 2 - b.top) * k };
}

/** 0 locked .. 1 open: the bolt pulls in over 120 ms after the relay closes and shoots back after it opens. */
function openness(t: number): number {
  return t < RELOCK ? clamp((t - UNLOCK) / 120) : 1 - clamp((t - RELOCK) / 120);
}

const bleDoorLockNrf52840: Cell = {
  duration: DURATION,
  extras: {
    parts: [lockPart('LOCK', LOCK.x, LOCK.y), batteryPart('BAT', BATTERY.x, BATTERY.y)],
    wires: [
      { id: 'load-com', from: [RELAY, 'COM'], to: ['BAT', 'pos'], color: '#ff0000', via: [{ x: -142, y: 124 }, { x: -142, y: 224 }] },
      { id: 'load-ret', from: ['BAT', 'neg'], to: ['LOCK', 'A'], color: '#000000', via: [{ x: -334, y: 224 }, { x: -334, y: 196 }, { x: LOCK.x + 60, y: 196 }] },
      { id: 'load-no', from: [RELAY, 'NO'], to: ['LOCK', 'B'], color: '#aa00ff', via: [{ x: -152, y: 114 }, { x: -152, y: 192 }, { x: LOCK.x + 92, y: 192 }] },
    ],
  },
  decor: {
    html: `
      ${phone('phone', { ...PHONE, fontSize: F, title: 'BLE-Lock', maxRows: 2 })}
      <div data-c-dln-wrong style="position:absolute;left:${VERDICT.x}px;top:${VERDICT.y}px;font:600 ${F}px/1.15 var(--sans);color:${RED}">wrong<br>PIN</div>
      ${finger('f', { length: 64, rotate: TAP.rotate })}`,
    // The left edge leaves room for the finger parked on the keypad frame.
    bounds: [LOCK.x - 30, BATTERY.y, PHONE.x + PHONE.w, PHONE.y + PHONE.h],
  },
  setup(view) {
    // The connector lengthens the keypad's drawing, which would move the centre it turns about;
    // keep turning it about the centre the circuit's pins were placed with.
    const keypad = view.part<Keypad>(KEYPAD);
    const wrapper = keypad.closest<HTMLElement>('.cell-wrapper')!;
    wrapper.style.transformOrigin = `${wrapper.offsetWidth / 2}px ${wrapper.offsetHeight / 2}px`;
    keypad.connector = true;
    // Key legends turned back upright on the turned keypad.
    for (const label of keypad.shadowRoot!.querySelectorAll('[data-key-name] text')) label.setAttribute('transform', 'rotate(90 5.6 5.5)');
  },
  run(t, view) {
    const taps = KEYS.map(({ key, down }) => {
      const c = keyCentre(view, key);
      return { at: { x: c.x + TAP.aim.x, y: c.y + TAP.aim.y }, down, up: down + HOLD };
    });
    // During the 5 s the lock is open the finger waits on the keypad's left frame, beside key 2.
    const two = keyCentre(view, '2');
    const i = tapFinger(view, 'f', t, taps, DURATION, { park: { x: two.x - 40, y: two.y } });
    const held = i >= 0 ? KEYS[i] : undefined;
    for (const { key } of KEYS) keyEl(view, key).classList.toggle('pressed', held?.key === key);
    if (held) {
      view.glowWire(ROW_WIRES[held.row], 1);
      view.glowWire(COL_WIRES[held.col], 1);
    }

    const open = t >= UNLOCK && t < RELOCK;
    view.part<Relay>(RELAY).energized = open;
    view.glowWire(RELAY_WIRE, open ? 1 : 0);
    for (const id of LOAD_WIRES) view.glowWire(id, open ? 0.6 : 0);
    setLock(view, 'LOCK', openness(t));

    view.q<HTMLElement>('[data-c-dln-wrong]').style.opacity = String(Math.min(clamp((t - WRONG - 30) / 150), 1 - clamp((t - KEYS[4].down) / 150)));
    setPhoneLink(view, 'phone', true);
    runPhone(view, 'phone', t, CHAT, FADE_FROM, 'fade');
  },
};

export default bleDoorLockNrf52840;

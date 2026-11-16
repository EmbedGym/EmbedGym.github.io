import { clamp } from '../../anim';
import type { Cell } from '../../cell';
import { batteryPart } from '../../decor/battery';
import { finger, KEYPAD, tapFinger } from '../../decor/finger';
import { lockPart, setLock } from '../../decor/lock';
import { keypadKey } from '../../kit';

type Keypad = HTMLElement & { connector: boolean };
type Relay = HTMLElement & { energized: boolean };
type Lcd = HTMLElement & { text: string };

// 1-2-3-4 is typed, the LCD echoing each key; the fourth drives pin 13 HIGH (relay
// closes, the lock's bolt pulls in) and prints Success. Then 4-3-2-1: a wrong code drives it
// LOW again and prints Fail. The sketch scans every 20 ms and acts on each new key.
const DURATION = 5800;
const HOLD = 180;
const KEYS = [
  { key: '1', row: 0, col: 0, down: 400 },
  { key: '2', row: 0, col: 1, down: 850 },
  { key: '3', row: 0, col: 2, down: 1300 },
  { key: '4', row: 1, col: 0, down: 1750 },
  { key: '4', row: 1, col: 0, down: 3350 },
  { key: '3', row: 0, col: 2, down: 3800 },
  { key: '2', row: 0, col: 1, down: 4250 },
  { key: '1', row: 0, col: 0, down: 4700 },
];
const SEEN = KEYS.map(({ down }) => down + 12);
const RELAY_ON = SEEN[3];
const RELAY_OFF = SEEN[7];
const ROW_WIRES = ['w-22-R1', 'w-24-R2', 'w-26-R3', 'w-28-R4'];
const COL_WIRES = ['w-30-C1', 'w-32-C2', 'w-34-C3', 'w-36-C4'];
const LCD_WIRES = ['w-12-RS', 'w-11-E', 'w-4-D4', 'w-5-D5', 'w-6-D6', 'w-7-D7'];

// Before the first key of this loop the LCD still shows the previous loop's 4-3-2-1 and Fail.
const row = (s: string) => s.padEnd(16, ' ');
export function screenAt(t: number) {
  const typed = SEEN.filter((s) => s <= t).length;
  if (typed === 0) return row('Input: 4321') + row('Status: Fail');
  const entry = Math.floor((typed - 1) / 4);
  const digits = KEYS.slice(entry * 4, typed).map((k) => k.key).join('');
  const status = digits.length < 4 ? '' : entry === 0 ? 'Status: Success' : 'Status: Fail';
  return row(`Input: ${digits}`) + row(status);
}

// The relay's load, which circuit.ts leaves out: a 12 V pack and a solenoid lock,
// wired COM -> pack -> lock -> NO, left of the relay.
const BATTERY = { x: -368, y: -221 };
const LOCK_AT = { x: -290, y: -225 };
const LOAD_SCALE = 2;
// A large copy of the two LCD rows, under the keypad ribbon, readable at card size.
const MIRROR = { x: 396, y: 96, w: 420, h: 128 };

const safeboxDisplay: Cell = {
  duration: DURATION,
  extras: {
    parts: [
      batteryPart('BAT', BATTERY.x, BATTERY.y, { plus: 'down', leads: 'plus-end', scale: LOAD_SCALE }),
      lockPart('LOCK', LOCK_AT.x, LOCK_AT.y, LOAD_SCALE),
    ],
    wires: [
      { id: 'load-com', from: ['RLY1', 'COM'], to: ['BAT', 'pos'], color: '#ff8800', via: [{ x: -354, y: -33 }] },
      { id: 'load-ret', from: ['BAT', 'neg'], to: ['LOCK', 'A'], color: '#8b4513', via: [{ x: -326, y: -50 }, { x: -170, y: -50 }] },
      { id: 'load-no', from: ['RLY1', 'NO'], to: ['LOCK', 'B'], color: '#00aaaa', via: [{ x: -106, y: -43 }] },
    ],
  },
  decor: {
    html: `
      <style>
        .c-sbd-mirror {
          position: absolute; left: ${MIRROR.x}px; top: ${MIRROR.y}px; width: ${MIRROR.w}px; height: ${MIRROR.h}px;
          box-sizing: border-box; padding: 8px 16px; display: flex; flex-direction: column; justify-content: center;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
          font: 600 42px/1.25 var(--mono); color: var(--ink); white-space: pre;
        }
        .c-sbd-mirror .c-sbd-ok { color: #2b8a3e; }
        .c-sbd-mirror .c-sbd-bad { color: var(--warn); }
      </style>
      <div class="c-sbd-mirror"><div class="c-sbd-r0"></div><div class="c-sbd-r1"></div></div>
      ${finger('f', { length: 84, rotate: KEYPAD.rotate })}`,
    bounds: [MIRROR.x, MIRROR.y, MIRROR.x + MIRROR.w, MIRROR.y + MIRROR.h],
  },
  setup(view) {
    view.part<Keypad>('KP1').connector = true;
  },
  run(t, view) {
    const held = KEYS.find(({ down }) => t >= down && t < down + HOLD);
    const pad = view.part<Keypad>('KP1').shadowRoot!;
    for (const key of ['1', '2', '3', '4']) pad.querySelector(`[data-key-name="${key}"]`)!.classList.toggle('pressed', held?.key === key);
    const taps = KEYS.map(({ key, down }) => {
      const c = keypadKey(view, 'KP1', key);
      return { at: { x: c.x + KEYPAD.aim.x, y: c.y + KEYPAD.aim.y }, down, up: down + HOLD };
    });
    tapFinger(view, 'f', t, taps, DURATION);
    if (held) {
      view.glowWire(ROW_WIRES[held.row], 1);
      view.glowWire(COL_WIRES[held.col], 1);
    } else {
      // Between presses the sketch drives the rows LOW in turn; the sweep is slowed down to be seen.
      view.glowWire(ROW_WIRES[Math.floor(t / 150) % ROW_WIRES.length], 0.35);
    }

    const screen = screenAt(t);
    view.part<Lcd>('LCD1').text = screen;
    view.q<HTMLElement>('.c-sbd-r0').textContent = screen.slice(0, 16).trimEnd();
    const status = view.q<HTMLElement>('.c-sbd-r1');
    status.textContent = screen.slice(16).trimEnd() || ' ';
    status.className = `c-sbd-r1${screen.includes('Success') ? ' c-sbd-ok' : screen.includes('Fail') ? ' c-sbd-bad' : ''}`;

    const open = t >= RELAY_ON && t < RELAY_OFF;
    view.part<Relay>('RLY1').energized = open;
    if (open) {
      view.glowWire('w-13-IN', 1);
      for (const id of ['load-com', 'load-ret', 'load-no']) view.glowWire(id, 0.6);
    }
    // The bolt pulls in over 120 ms after the relay closes and shoots back after it opens.
    setLock(view, 'LOCK', t < RELAY_OFF ? clamp((t - RELAY_ON) / 120) : 1 - clamp((t - RELAY_OFF) / 120));
  },
  activity: [{ wires: LCD_WIRES, at: SEEN.map((s) => s + 2) }],
};

export default safeboxDisplay;

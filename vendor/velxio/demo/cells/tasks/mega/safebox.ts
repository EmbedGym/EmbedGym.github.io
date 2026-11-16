import { clamp } from '../../anim';
import type { Cell } from '../../cell';
import { batteryPart } from '../../decor/battery';
import { finger, KEYPAD, tapFinger } from '../../decor/finger';
import { lockPart, setLock } from '../../decor/lock';
import { keypadKey } from '../../kit';

type Keypad = HTMLElement & { connector: boolean };
type Relay = HTMLElement & { energized: boolean };

// 1-2-3-4 is typed and the fourth key drives pin 13 HIGH: the relay closes and
// the lock's bolt pulls in. Then 4-3-2-1 is typed; a wrong code drives it LOW again and the
// bolt shoots back. The sketch scans every 20 ms and acts on each new key.
export const DURATION = 5800;
export const HOLD = 180;
export const KEYS = [
  { key: '1', row: 0, col: 0, down: 400 },
  { key: '2', row: 0, col: 1, down: 850 },
  { key: '3', row: 0, col: 2, down: 1300 },
  { key: '4', row: 1, col: 0, down: 1750 },
  { key: '4', row: 1, col: 0, down: 3350 },
  { key: '3', row: 0, col: 2, down: 3800 },
  { key: '2', row: 0, col: 1, down: 4250 },
  { key: '1', row: 0, col: 0, down: 4700 },
];
export const SEEN = KEYS.map(({ down }) => down + 12);
export const RELAY_ON = SEEN[3];
export const RELAY_OFF = SEEN[7];
const ROW_WIRES = ['w-9-R1', 'w-8-R2', 'w-7-R3', 'w-6-R4'];
const COL_WIRES = ['w-5-C1', 'w-4-C2', 'w-3-C3', 'w-2-C4'];

// The relay's load, which circuit.ts leaves out: a 12 V pack and a solenoid lock,
// wired COM -> pack -> lock -> NO, right of the relay. Cell coordinates: the relay
// spans x 400..488, y -44..4, with NC/COM/NO on its right edge at y -30/-20/-10.
const BATTERY = { x: 511.5, y: -167 };
const LOCK_AT = { x: 570, y: -170 };
const LOAD_SCALE = 1.5;

// Above the battery and lock.
const PANEL = { x: 510, y: -270, w: 244, h: 76 };

export function codeAt(t: number) {
  const typed = SEEN.filter((s) => s <= t).length;
  // Before the first key of this loop the previous loop's 4-3-2-1 is still shown.
  if (typed === 0) return { digits: KEYS.slice(4).map((k) => k.key), entry: 1 };
  const entry = Math.floor((typed - 1) / 4);
  return { digits: KEYS.slice(entry * 4, typed).map((k) => k.key), entry };
}

const safebox: Cell = {
  duration: DURATION,
  extras: {
    parts: [
      batteryPart('BAT', BATTERY.x, BATTERY.y, { plus: 'down', leads: 'plus-end', scale: LOAD_SCALE }),
      lockPart('LOCK', LOCK_AT.x, LOCK_AT.y, LOAD_SCALE),
    ],
    wires: [
      { id: 'load-com', from: ['RLY1', 'COM'], to: ['BAT', 'pos'], color: '#ff8800', via: [{ x: 522, y: -20 }] },
      { id: 'load-ret', from: ['BAT', 'neg'], to: ['LOCK', 'A'], color: '#8b4513', via: [{ x: 543, y: -35 }, { x: 660, y: -35 }] },
      { id: 'load-no', from: ['RLY1', 'NO'], to: ['LOCK', 'B'], color: '#aa00ff', via: [{ x: 708, y: -10 }] },
    ],
  },
  decor: {
    html: `
      <style>
        .c-sb-panel {
          position: absolute; left: ${PANEL.x}px; top: ${PANEL.y}px; width: ${PANEL.w}px; height: ${PANEL.h}px;
          box-sizing: border-box; padding: 0 16px; display: flex; align-items: center; gap: 14px;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
        }
        .c-sb-title { font: 600 30px var(--sans); color: var(--muted); }
        .c-sb-code { font: 700 44px/1 var(--mono); color: var(--ink); letter-spacing: 2px; white-space: pre; }
        .c-sb-code i { font-style: normal; color: #c5ccd6; }
        .c-sb-code.c-sb-ok { color: #2b8a3e; }
        .c-sb-code.c-sb-bad { color: var(--warn); }
      </style>
      <div class="c-sb-panel"><div class="c-sb-title">Code</div><div class="c-sb-code"></div></div>
      ${finger('f', { length: 84, rotate: KEYPAD.rotate })}`,
    bounds: [PANEL.x, PANEL.y, PANEL.x + PANEL.w, PANEL.y + PANEL.h],
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

    const { digits, entry } = codeAt(t);
    const complete = digits.length === 4;
    const code = view.q<HTMLElement>('.c-sb-code');
    code.innerHTML = digits.join('') + '<i>•</i>'.repeat(4 - digits.length);
    code.classList.toggle('c-sb-ok', complete && entry === 0);
    code.classList.toggle('c-sb-bad', complete && entry === 1);

    const open = t >= RELAY_ON && t < RELAY_OFF;
    view.part<Relay>('RLY1').energized = open;
    if (open) {
      view.glowWire('w-13-IN', 1);
      for (const id of ['load-com', 'load-ret', 'load-no']) view.glowWire(id, 0.6);
    }
    // The bolt pulls in over 120 ms after the relay closes and shoots back after it opens.
    setLock(view, 'LOCK', t < RELAY_OFF ? clamp((t - RELAY_ON) / 120) : 1 - clamp((t - RELAY_OFF) / 120));
  },
};

export default safebox;

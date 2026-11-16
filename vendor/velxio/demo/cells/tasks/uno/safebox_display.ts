import { clamp } from '../../anim';
import type { Cell } from '../../cell';
import { batteryPart } from '../../decor/battery';
import { finger, KEYPAD, tapFinger } from '../../decor/finger';
import { lockPart, setLock } from '../../decor/lock';
import { keypadKey } from '../../kit';
import { DURATION, HOLD, KEYS, RELAY_OFF, RELAY_ON, SEEN } from '../mega/safebox';
import { screenAt } from '../mega/safebox_display';

type Keypad = HTMLElement & { connector: boolean };
type Relay = HTMLElement & { energized: boolean };
type Lcd = HTMLElement & { text: string };

const ROW_WIRES = ['w-2-R1', 'w-3-R2', 'w-8-R3', 'w-9-R4'];
const COL_WIRES = ['w-10-C1', 'w-A0-C2', 'w-A1-C3', 'w-A2-C4'];
const LCD_WIRES = ['w-12-RS', 'w-11-E', 'w-4-D4', 'w-5-D5', 'w-6-D6', 'w-7-D7'];
const RELAY_WIRE = 'w-13-IN';

// The relay's load, which circuit.ts leaves out: a 12 V pack and a solenoid lock,
// wired COM -> pack -> lock -> NO, left of the relay (its NO/COM pins at x -122, y 44/54).
const LOAD_SCALE = 2;
const LOCK_AT = { x: -356, y: -146 };
const BATTERY = { x: -256, y: 94 };
// A large copy of the two LCD rows, above the lock and left of the LCD.
const MIRROR = { x: -500, y: -310, w: 458, h: 140 };

const safeboxDisplayUno: Cell = {
  duration: DURATION,
  extras: {
    parts: [
      batteryPart('BAT', BATTERY.x, BATTERY.y, { plus: 'right', leads: 'up', scale: LOAD_SCALE }),
      lockPart('LOCK', LOCK_AT.x, LOCK_AT.y, LOAD_SCALE),
    ],
    wires: [
      { id: 'load-com', from: ['RLY1', 'COM'], to: ['BAT', 'pos'], color: '#ff0000', via: [{ x: -132, y: 54 }] },
      { id: 'load-ret', from: ['BAT', 'neg'], to: ['LOCK', 'A'], color: '#000000' },
      { id: 'load-no', from: ['RLY1', 'NO'], to: ['LOCK', 'B'], color: '#aa00ff', via: [{ x: -172, y: 44 }] },
    ],
  },
  decor: {
    html: `
      <style>
        .c-sbdu-mirror {
          position: absolute; box-sizing: border-box; padding: 8px 16px; display: flex; flex-direction: column; justify-content: center;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
          font: 600 46px/1.25 var(--mono); color: var(--ink); white-space: pre;
        }
        .c-sbdu-mirror .c-sbdu-ok { color: #2b8a3e; }
        .c-sbdu-mirror .c-sbdu-bad { color: var(--warn); }
      </style>
      <div class="c-sbdu-mirror" style="left:${MIRROR.x}px;top:${MIRROR.y}px;width:${MIRROR.w}px;height:${MIRROR.h}px">
        <div class="c-sbdu-r0"></div><div class="c-sbdu-r1"></div>
      </div>
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
    }

    const screen = screenAt(t);
    view.part<Lcd>('LCD1').text = screen;
    view.q<HTMLElement>('.c-sbdu-r0').textContent = screen.slice(0, 16).trimEnd();
    const status = view.q<HTMLElement>('.c-sbdu-r1');
    status.textContent = screen.slice(16).trimEnd() || ' ';
    status.className = `c-sbdu-r1${screen.includes('Success') ? ' c-sbdu-ok' : screen.includes('Fail') ? ' c-sbdu-bad' : ''}`;

    const open = t >= RELAY_ON && t < RELAY_OFF;
    view.part<Relay>('RLY1').energized = open;
    if (open) {
      view.glowWire(RELAY_WIRE, 1);
      for (const id of ['load-com', 'load-ret', 'load-no']) view.glowWire(id, 0.6);
    }
    // The bolt pulls in over 120 ms after the relay closes and shoots back after it opens.
    setLock(view, 'LOCK', t < RELAY_OFF ? clamp((t - RELAY_ON) / 120) : 1 - clamp((t - RELAY_OFF) / 120));
  },
  activity: [{ wires: LCD_WIRES, at: SEEN.map((s) => s + 2) }],
};

export default safeboxDisplayUno;

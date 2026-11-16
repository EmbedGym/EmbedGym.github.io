import { clamp } from '../../anim';
import type { Cell } from '../../cell';
import { batteryPart } from '../../decor/battery';
import { finger, KEYPAD, tapFinger } from '../../decor/finger';
import { lockPart, setLock } from '../../decor/lock';
import { keypadKey } from '../../kit';
import { codeAt, DURATION, HOLD, KEYS, RELAY_OFF, RELAY_ON } from '../mega/safebox';

type Keypad = HTMLElement & { connector: boolean };
type Relay = HTMLElement & { energized: boolean };

const ROW_WIRES = ['w-9-R1', 'w-8-R2', 'w-7-R3', 'w-6-R4'];
const COL_WIRES = ['w-5-C1', 'w-4-C2', 'w-3-C3', 'w-2-C4'];
const RELAY_WIRE = 'w-13-IN';

// The relay's load, which circuit.ts leaves out: a 12 V pack and a solenoid lock,
// wired COM -> pack -> lock -> NO, left of the relay (its NO/COM pins at x -112, y -40/-30).
const LOAD_SCALE = 2;
const LOCK_AT = { x: -346, y: -230 };
const BATTERY = { x: -246, y: 10 };

// Above the lock.
const PANEL = { x: -346, y: -350, w: 300, h: 100 };

const safeboxUno: Cell = {
  duration: DURATION,
  extras: {
    parts: [
      batteryPart('BAT', BATTERY.x, BATTERY.y, { plus: 'right', leads: 'up', scale: LOAD_SCALE }),
      lockPart('LOCK', LOCK_AT.x, LOCK_AT.y, LOAD_SCALE),
    ],
    wires: [
      { id: 'load-com', from: ['RLY1', 'COM'], to: ['BAT', 'pos'], color: '#ff0000', via: [{ x: -122, y: -30 }] },
      { id: 'load-ret', from: ['BAT', 'neg'], to: ['LOCK', 'A'], color: '#000000' },
      { id: 'load-no', from: ['RLY1', 'NO'], to: ['LOCK', 'B'], color: '#aa00ff', via: [{ x: -162, y: -40 }] },
    ],
  },
  decor: {
    html: `
      <style>
        .c-sbu-panel {
          position: absolute; box-sizing: border-box; padding: 0 20px; display: flex; align-items: center; gap: 18px;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
        }
        .c-sbu-title { font: 600 42px var(--sans); color: var(--muted); }
        .c-sbu-code { font: 700 60px/1 var(--mono); color: var(--ink); letter-spacing: 2px; white-space: pre; }
        .c-sbu-code i { font-style: normal; color: #c5ccd6; }
        .c-sbu-code.c-sbu-ok { color: #2b8a3e; }
        .c-sbu-code.c-sbu-bad { color: var(--warn); }
      </style>
      <div class="c-sbu-panel" style="left:${PANEL.x}px;top:${PANEL.y}px;width:${PANEL.w}px;height:${PANEL.h}px">
        <div class="c-sbu-title">Code</div><div class="c-sbu-code"></div>
      </div>
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
    }

    const { digits, entry } = codeAt(t);
    const complete = digits.length === 4;
    const code = view.q<HTMLElement>('.c-sbu-code');
    code.innerHTML = digits.join('') + '<i>•</i>'.repeat(4 - digits.length);
    code.classList.toggle('c-sbu-ok', complete && entry === 0);
    code.classList.toggle('c-sbu-bad', complete && entry === 1);

    const open = t >= RELAY_ON && t < RELAY_OFF;
    view.part<Relay>('RLY1').energized = open;
    if (open) {
      view.glowWire(RELAY_WIRE, 1);
      for (const id of ['load-com', 'load-ret', 'load-no']) view.glowWire(id, 0.6);
    }
    // The bolt pulls in over 120 ms after the relay closes and shoots back after it opens.
    setLock(view, 'LOCK', t < RELAY_OFF ? clamp((t - RELAY_ON) / 120) : 1 - clamp((t - RELAY_OFF) / 120));
  },
};

export default safeboxUno;

import { clamp } from '../../anim';
import type { Cell } from '../../cell';
import { batteryPart } from '../../decor/battery';
import { finger, KEYPAD, tapFinger } from '../../decor/finger';
import { lockPart, setLock } from '../../decor/lock';
import { keypadKey } from '../../kit';
import { codeAt, DURATION, HOLD, KEYS, RELAY_OFF, RELAY_ON } from '../mega/safebox';

type Keypad = HTMLElement & { connector: boolean };
type Relay = HTMLElement & { energized: boolean };

const ROW_WIRES = ['w-P1.08-R1', 'w-P1.01-R2', 'w-P1.02-R3', 'w-P0.27-R4'];
const COL_WIRES = ['w-P0.21-C1', 'w-P0.23-C2', 'w-P1.14-C3', 'w-P1.13-C4'];
const RELAY_WIRE = 'w-P1.15-IN';

// The relay's load, which circuit.ts leaves out: a 12 V pack and a solenoid lock,
// wired COM -> pack -> lock -> NO, left of the relay (its NO/COM pins at x -110, y -20/-10).
const LOAD_SCALE = 2;
const LOCK_AT = { x: -344, y: -210 };
const BATTERY = { x: -244, y: 30 };

// Above the lock.
const PANEL = { x: -344, y: -340, w: 340, h: 110 };

const safeboxNrf52840: Cell = {
  duration: DURATION,
  extras: {
    parts: [
      batteryPart('BAT', BATTERY.x, BATTERY.y, { plus: 'right', leads: 'up', scale: LOAD_SCALE }),
      lockPart('LOCK', LOCK_AT.x, LOCK_AT.y, LOAD_SCALE),
    ],
    wires: [
      { id: 'load-com', from: ['RLY1', 'COM'], to: ['BAT', 'pos'], color: '#ff0000', via: [{ x: -120, y: -10 }] },
      { id: 'load-ret', from: ['BAT', 'neg'], to: ['LOCK', 'A'], color: '#000000' },
      { id: 'load-no', from: ['RLY1', 'NO'], to: ['LOCK', 'B'], color: '#aa00ff', via: [{ x: -160, y: -20 }] },
    ],
  },
  decor: {
    html: `
      <style>
        .c-sbn-panel {
          position: absolute; box-sizing: border-box; padding: 0 20px; display: flex; align-items: center; gap: 18px;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
        }
        .c-sbn-title { font: 600 48px var(--sans); color: var(--muted); }
        .c-sbn-code { font: 700 66px/1 var(--mono); color: var(--ink); letter-spacing: 2px; white-space: pre; }
        .c-sbn-code i { font-style: normal; color: #c5ccd6; }
        .c-sbn-code.c-sbn-ok { color: #2b8a3e; }
        .c-sbn-code.c-sbn-bad { color: var(--warn); }
      </style>
      <div class="c-sbn-panel" style="left:${PANEL.x}px;top:${PANEL.y}px;width:${PANEL.w}px;height:${PANEL.h}px">
        <div class="c-sbn-title">Code</div><div class="c-sbn-code"></div>
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
    const code = view.q<HTMLElement>('.c-sbn-code');
    code.innerHTML = digits.join('') + '<i>•</i>'.repeat(4 - digits.length);
    code.classList.toggle('c-sbn-ok', complete && entry === 0);
    code.classList.toggle('c-sbn-bad', complete && entry === 1);

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

export default safeboxNrf52840;

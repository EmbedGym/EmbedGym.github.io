import { clamp } from '../../anim';
import type { Cell } from '../../cell';
import { batteryPart } from '../../decor/battery';
import { finger, KEYPAD, tapFinger } from '../../decor/finger';
import { lockPart, setLock } from '../../decor/lock';
import { keypadKey } from '../../kit';
import { codeAt, DURATION, HOLD, KEYS, RELAY_OFF, RELAY_ON } from '../mega/safebox';

type Keypad = HTMLElement & { connector: boolean };
type Relay = HTMLElement & { energized: boolean };

const ROW_WIRES = ['w-9-R1', 'w-10-R2', 'w-11-R3', 'w-13-R4'];
const COL_WIRES = ['w-14-C1', 'w-12-C2', 'w-43-C3', 'w-44-C4'];
const RELAY_WIRE = 'w-21-IN';

// The relay's load, which circuit.ts leaves out: a 12 V pack and a solenoid lock,
// wired COM -> pack -> lock -> NO, above and right of the relay (its COM/NO pins at x 248, y 375/385).
const LOAD_SCALE = 2;
const BATTERY = { x: 256, y: 184 };
const LOCK_AT = { x: 322, y: 180 };

// Above the lock.
const PANEL = { x: 240, y: 30, w: 300, h: 100 };

const safeboxEsp32s3: Cell = {
  duration: DURATION,
  extras: {
    parts: [
      batteryPart('BAT', BATTERY.x, BATTERY.y, { plus: 'down', leads: 'plus-end', scale: LOAD_SCALE }),
      lockPart('LOCK', LOCK_AT.x, LOCK_AT.y, LOAD_SCALE),
    ],
    wires: [
      { id: 'load-com', from: ['RLY1', 'COM'], to: ['BAT', 'pos'], color: '#ff0000', via: [{ x: 270, y: 375 }] },
      { id: 'load-ret', from: ['BAT', 'neg'], to: ['LOCK', 'A'], color: '#000000', via: [{ x: 298, y: 360 }, { x: 442, y: 360 }] },
      { id: 'load-no', from: ['RLY1', 'NO'], to: ['LOCK', 'B'], color: '#aa00ff', via: [{ x: 506, y: 385 }] },
    ],
  },
  decor: {
    html: `
      <style>
        .c-sbe-panel {
          position: absolute; box-sizing: border-box; padding: 0 20px; display: flex; align-items: center; gap: 18px;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
        }
        .c-sbe-title { font: 600 42px var(--sans); color: var(--muted); }
        .c-sbe-code { font: 700 60px/1 var(--mono); color: var(--ink); letter-spacing: 2px; white-space: pre; }
        .c-sbe-code i { font-style: normal; color: #c5ccd6; }
        .c-sbe-code.c-sbe-ok { color: #2b8a3e; }
        .c-sbe-code.c-sbe-bad { color: var(--warn); }
      </style>
      <div class="c-sbe-panel" style="left:${PANEL.x}px;top:${PANEL.y}px;width:${PANEL.w}px;height:${PANEL.h}px">
        <div class="c-sbe-title">Code</div><div class="c-sbe-code"></div>
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
    const code = view.q<HTMLElement>('.c-sbe-code');
    code.innerHTML = digits.join('') + '<i>•</i>'.repeat(4 - digits.length);
    code.classList.toggle('c-sbe-ok', complete && entry === 0);
    code.classList.toggle('c-sbe-bad', complete && entry === 1);

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

export default safeboxEsp32s3;

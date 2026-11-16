import type { Cell, CellView } from '../../cell';
import { finger, KEYPAD, tapFinger } from '../../decor/finger';
import { keypadKey, serialPanel, showSerial, USB } from '../../kit';

type Keypad = HTMLElement & { connector: boolean };

// Three keys pressed in turn. The sketch drives one row LOW at a time and reads the columns;
// while a key is held it prints it, waits 50 ms and scans again, so a short press prints a few lines.
export const DURATION = 3600;
export const KEYS = [
  { key: '5', row: 1, col: 1, down: 500 },
  { key: 'A', row: 0, col: 3, down: 1500 },
  { key: '#', row: 3, col: 2, down: 2500 },
];
export const HOLD = 180;
export const REPEAT = 52;
const ROW_WIRES = ['w-9-R1', 'w-8-R2', 'w-7-R3', 'w-6-R4'];
const COL_WIRES = ['w-5-C1', 'w-4-C2', 'w-3-C3', 'w-2-C4'];
const LOOP_PRINTS = KEYS.flatMap(({ key, down }) =>
  Array.from({ length: Math.ceil(HOLD / REPEAT) }, (_, i) => ({ t: down + 2 + i * REPEAT, text: `Key Pressed: ${key}` })),
);
// The previous loop's lines are already on screen at t=0, matching the end state.
export const PRINTS = [...LOOP_PRINTS.map((p) => ({ ...p, t: p.t - DURATION })), ...LOOP_PRINTS];

// Left of the board, level with its USB socket; two rows of 30 px text.
const FONT = 30;
const PANEL_H = 34 + 2 * FONT * 1.36 + 10;
const PANEL = { x: -300, y: USB.mega.y + 8 - PANEL_H, w: 282, h: PANEL_H };

function keyEl(view: CellView, key: string) {
  return view.part<Keypad>('KP1').shadowRoot!.querySelector(`[data-key-name="${key}"]`)!;
}

const keypad16: Cell = {
  duration: DURATION,
  decor: {
    html: `${serialPanel('out', PANEL, { note: '115200', cableTo: USB.mega, fontSize: FONT })}${finger('f', { length: 84, rotate: KEYPAD.rotate })}`,
    bounds: [PANEL.x, PANEL.y, PANEL.x + PANEL.w, PANEL.y + PANEL.h],
  },
  setup(view) {
    view.part<Keypad>('KP1').connector = true;
  },
  run(t, view) {
    const taps = KEYS.map(({ key, down }) => {
      const c = keypadKey(view, 'KP1', key);
      return { at: { x: c.x + KEYPAD.aim.x, y: c.y + KEYPAD.aim.y }, down, up: down + HOLD };
    });
    const i = tapFinger(view, 'f', t, taps, DURATION);
    const held = i >= 0 ? KEYS[i] : undefined;
    for (const { key } of KEYS) keyEl(view, key).classList.toggle('pressed', held?.key === key);
    if (held) {
      view.glowWire(ROW_WIRES[held.row], 1);
      view.glowWire(COL_WIRES[held.col], 1);
    } else {
      // Between presses the sketch drives the rows LOW in turn; the sweep is slowed down to be seen.
      view.glowWire(ROW_WIRES[Math.floor(t / 150) % ROW_WIRES.length], 0.35);
    }
    showSerial(view, 'out', t, PRINTS, { board: 'arduino-mega' });
  },
};

export default keypad16;

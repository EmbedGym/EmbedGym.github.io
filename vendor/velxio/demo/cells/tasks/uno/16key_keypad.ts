import type { Cell, CellView } from '../../cell';
import { finger, KEYPAD, tapFinger } from '../../decor/finger';
import { keypadKey, serialPanel, showSerial, USB } from '../../kit';
import { DURATION, HOLD, KEYS, PRINTS } from '../mega/16key_keypad';

type Keypad = HTMLElement & { connector: boolean };

const BOARD = 'arduino-uno';
const ROW_WIRES = ['w-9-R1', 'w-8-R2', 'w-7-R3', 'w-6-R4'];
const COL_WIRES = ['w-5-C1', 'w-4-C2', 'w-3-C3', 'w-2-C4'];

// Left of the board, level with its USB socket; two rows of 30 px text.
const FONT = 30;
const PANEL_H = 34 + 2 * FONT * 1.36 + 10;
const PANEL = { x: -300, y: USB.uno.y + 8 - PANEL_H, w: 282, h: PANEL_H };

function keyEl(view: CellView, key: string) {
  return view.part<Keypad>('KP1').shadowRoot!.querySelector(`[data-key-name="${key}"]`)!;
}

const keypad16Uno: Cell = {
  duration: DURATION,
  decor: {
    html: `${serialPanel('out', PANEL, { note: '115200', cableTo: USB.uno, fontSize: FONT })}${finger('f', { length: 84, rotate: KEYPAD.rotate })}`,
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
    }
    showSerial(view, 'out', t, PRINTS, { board: BOARD });
  },
};

export default keypad16Uno;

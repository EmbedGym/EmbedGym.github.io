import type { Cell, CellView } from '../../cell';
import { finger, tapFinger } from '../../decor/finger';
import { serialPanel, showSerial, USB } from '../../kit';
// ESP-IDF: the same scan as the AVR sketch; vTaskDelay(50 ms) after each print, 1 ms ticks.
import { DURATION, HOLD, KEYS, PRINTS } from '../mega/16key_keypad';

type Keypad = HTMLElement & { connector: boolean };

const BOARD = 'esp32-s3';
const ROW_WIRES = ['w-38-R1', 'w-39-R2', 'w-21-R3', 'w-14-R4'];
const COL_WIRES = ['w-10-C1', 'w-9-C2', 'w-41-C3', 'w-40-C4'];

// Under the UART socket, below the three wires that pass under the board; two rows of 30 px text.
const FONT = 30;
const PANEL = { x: -155, y: 408, w: 280, h: 34 + 2 * FONT * 1.36 + 10 };

// The finger comes from the right and lands on each key's lower-right corner, lying in the
// gap below that key's row.
const TAP = { rotate: 102, aim: { x: 16, y: 17 } };

function keyEl(view: CellView, key: string) {
  return view.part<Keypad>('KP1').shadowRoot!.querySelector(`[data-key-name="${key}"]`)!;
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

const keypad16Esp32s3: Cell = {
  duration: DURATION,
  decor: {
    html: `${serialPanel('out', PANEL, { note: '115200', cableTo: USB.esp32s3, fontSize: FONT })}${finger('f', { length: 64, rotate: TAP.rotate })}`,
    bounds: [PANEL.x, PANEL.y, PANEL.x + PANEL.w, PANEL.y + PANEL.h],
  },
  setup(view) {
    // The connector lengthens the keypad's drawing, which would move the centre it turns about;
    // keep turning it about the centre the circuit's pins were placed with.
    const keypad = view.part<Keypad>('KP1');
    const wrapper = keypad.closest<HTMLElement>('.cell-wrapper')!;
    wrapper.style.transformOrigin = `${wrapper.offsetWidth / 2}px ${wrapper.offsetHeight / 2}px`;
    keypad.connector = true;
    // Key legends turned back upright on the turned keypad.
    for (const label of keypad.shadowRoot!.querySelectorAll('[data-key-name] text')) label.setAttribute('transform', 'rotate(-90 5.6 5.5)');
  },
  run(t, view) {
    const taps = KEYS.map(({ key, down }) => {
      const c = keyCentre(view, key);
      return { at: { x: c.x + TAP.aim.x, y: c.y + TAP.aim.y }, down, up: down + HOLD };
    });
    const i = tapFinger(view, 'f', t, taps, DURATION);
    const held = i >= 0 ? KEYS[i] : undefined;
    for (const { key } of KEYS) keyEl(view, key).classList.toggle('pressed', held?.key === key);
    if (held) {
      view.glowWire(ROW_WIRES[held.row], 1);
      view.glowWire(COL_WIRES[held.col], 1);
    }
    showSerial(view, 'out', t, PRINTS);
  },
};

export default keypad16Esp32s3;

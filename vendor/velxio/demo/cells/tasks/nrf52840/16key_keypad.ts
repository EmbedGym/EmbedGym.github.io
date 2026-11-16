import type { Cell, CellView } from '../../cell';
import { finger, tapFinger } from '../../decor/finger';
import { serialPanel, showSerial, USB } from '../../kit';
import { DURATION, HOLD, KEYS } from '../mega/16key_keypad';

type Keypad = HTMLElement & { connector: boolean };

const BOARD = 'nrf52840-dk';
const ROW_WIRES = ['w-P1.08-R1', 'w-P1.01-R2', 'w-P1.02-R3', 'w-P0.27-R4'];
const COL_WIRES = ['w-P0.21-C1', 'w-P0.23-C2', 'w-P1.14-C3', 'w-P1.13-C4'];

// Zephyr scans every 20 ms and prints a key once, when it goes down, not while it is held.
const LOOP_PRINTS = KEYS.map(({ key, down }) => ({ t: down + 10, text: `Key Pressed: ${key}` }));
// The previous loop's lines are already on screen at t=0, matching the end state.
const PRINTS = [...LOOP_PRINTS.map((p) => ({ ...p, t: p.t - DURATION })), ...LOOP_PRINTS];

// Left of the board, under the keypad and level with the USB socket; two rows of 30 px text.
const FONT = 30;
const PANEL_H = 34 + 2 * FONT * 1.36 + 10;
const PANEL = { x: -290, y: 100, w: 280, h: PANEL_H };

// A sits in the keypad's top-left corner at the card's top edge, so the finger comes from the
// lower left on the diagonal through the key corners, its pad on each key's lower-left corner.
const TAP = { rotate: 225, aim: { x: -13, y: 13 } };

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

const keypad16Nrf52840: Cell = {
  duration: DURATION,
  decor: {
    html: `${serialPanel('out', PANEL, { note: '115200', cableTo: USB.nrf52840, fontSize: FONT })}${finger('f', { length: 64, rotate: TAP.rotate })}`,
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
    for (const label of keypad.shadowRoot!.querySelectorAll('[data-key-name] text')) label.setAttribute('transform', 'rotate(90 5.6 5.5)');
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

export default keypad16Nrf52840;

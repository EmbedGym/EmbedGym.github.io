import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial } from '../../kit';
import { turn } from '../../decor/turn';
import { DURATION, encoderPrints, runEncoder } from '../uno/rotary_encoder';

// Board-specific names. main.c prints the Uno's line, printk("Position: %d Direction: %s\n"),
// from a CLK falling-edge callback that reads DT.
const BOARD = 'nrf52840-dk';
const CLK_WIRE = 'w-P1.08-CLK';
const DT_WIRE = 'w-P1.01-DT';

// The card's scale is ~0.6, so the text is drawn larger.
const FONT = 30;
// Two wrapped records: 34 + 4 rows × 1.36 × FONT + 10.
const SERIAL = { x: -356, y: USB.nrf52840.y - 110, w: 326, h: 208 };
const ARROW_DX = 34;

const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('out', SERIAL, { note: '115200', cableTo: USB.nrf52840, wrap: true, fontSize: FONT })}
      ${turn('knob')}`,
    bounds: [SERIAL.x, SERIAL.y, SERIAL.x + SERIAL.w, SERIAL.y + SERIAL.h],
  },
  run(t, view) {
    // The encoder's pins face down onto its wires, so the arrow sits on its open left side, level with the knob.
    const enc = view.box('ENC1');
    runEncoder(t, view, { clk: CLK_WIRE, dt: DT_WIRE }, 'knob', { x: enc.x - ARROW_DX, y: enc.y + 36 });
    showSerial(view, 'out', t, encoderPrints('fall'), { board: BOARD, fadeFrom: DURATION - 300 });
  },
};

export default cell;

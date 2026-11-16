import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial } from '../../kit';
import { turn } from '../../decor/turn';
import { DURATION, encoderPrints, runEncoder } from '../uno/rotary_encoder';

// Board-specific names. main.c prints the Uno's line, printf("Position: %d Direction: %s\n"),
// from a CLK rising-edge interrupt that reads DT.
const BOARD = 'esp32-s3';
const CLK_WIRE = 'w-43-CLK';
const DT_WIRE = 'w-44-DT';

// The board is tall and the console socket is at its bottom end, so the card's
// scale is low: text and the arrow are drawn larger.
const FONT = 42;
const ARROW_SCALE = 1.6;
const SERIAL = { x: -60, y: 366, w: 720, h: 159 };
const ARROW_DX = 54;
// The encoder's right edge in cell coordinates (layout.mjs), plus the arrow's reach.
const ARROW_RIGHT = 286 + ARROW_DX + 30 * ARROW_SCALE;

const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('out', SERIAL, { note: '115200', cableTo: USB.esp32s3, fontSize: FONT })}
      ${turn('knob')}`,
    bounds: [SERIAL.x, SERIAL.y, Math.max(ARROW_RIGHT, SERIAL.x + SERIAL.w), SERIAL.y + SERIAL.h],
  },
  run(t, view) {
    // The encoder is turned 180°, knob outward: the arrow sits right of it.
    const enc = view.box('ENC1');
    runEncoder(t, view, { clk: CLK_WIRE, dt: DT_WIRE }, 'knob', { x: enc.x + enc.w + ARROW_DX, y: enc.y + 36 }, ARROW_SCALE);
    showSerial(view, 'out', t, encoderPrints('rise'), { board: BOARD, fadeFrom: DURATION - 300 });
  },
};

export default cell;

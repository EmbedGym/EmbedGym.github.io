import type { Cell } from '../../cell';
import { glow, setGlow } from '../../decor/glow';
import { USB, serialPanel, showSerial } from '../../kit';
import { CHECKS, DURATION, fireHtml, flareAt, printsFor, runFire } from '../mega/fire_detector';

// ESP-IDF: AO reaches GPIO4 as 0.6 × AO through the 100k/150k divider; a 12-bit
// raw read at 11 dB. A status change prints before that check's reading.
const PRINTS = printsFor((volts) => Math.round(((0.6 * volts) / 3.3) * 4095));
const FONT = 33;
// Right of the board; the cable runs under the board to the downward socket.
const PANEL = { x: 200, y: 140, w: 380, h: 34 + 5 * FONT * 1.36 + 10 };
const CABLE_BOTTOM = USB.esp32s3.y + 32;
// Left of the MQ2, its smoke drifting onto the mesh head.
const BIN = { x: -440, y: 236 };

const fireDetectorEsp32s3: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('fires', PANEL, { note: '115200', cableTo: USB.esp32s3, wrap: true, fontSize: FONT })}${fireHtml('fds', BIN)}
      ${glow('fdsir', { tone: 'heat', scale: 1.2 })}`,
    bounds: [BIN.x - 6, -42, PANEL.x + PANEL.w, Math.max(BIN.y + 80, CABLE_BOTTOM + 4, PANEL.y + PANEL.h)],
  },
  activity: [{ wires: ['w0', 'w1'], at: CHECKS }],
  run(t, view) {
    const head = view.box('GAS1');
    runFire(view, 'fds', t, BIN, { x: head.x + 44.6, y: head.y + 38.5 }, {
      led: ['w12', 'w13'],
      buzzer: ['w10'],
      smoke: ['w6', 'w7', 'w8'],
    });
    // The IR thermometer warms while the bin blazes.
    const ir = view.box('IR1');
    setGlow(view, 'fdsir', { x: ir.x + ir.w / 2, y: ir.y + ir.h / 2 }, flareAt(t));
    showSerial(view, 'fires', t, PRINTS);
  },
};

export default fireDetectorEsp32s3;

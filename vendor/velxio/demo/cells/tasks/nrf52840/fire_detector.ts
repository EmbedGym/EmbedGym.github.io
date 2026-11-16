import type { Cell } from '../../cell';
import { glow, setGlow } from '../../decor/glow';
import { USB, serialPanel, showSerial } from '../../kit';
import { CHECKS, DURATION, fireHtml, flareAt, printsFor, runFire } from '../mega/fire_detector';

// Zephyr: AO reaches P0.03 (AIN1) as 0.6 × AO through the 100k/150k divider; a
// 12-bit SAADC read at gain 1/6 (3.6 V full scale). A status change prints
// before that check's reading.
const PRINTS = printsFor((volts) => Math.round(((0.6 * volts) / 3.6) * 4096));
const FONT = 38;
const PANEL = { x: -430, y: -95, w: 400, h: 34 + 5 * FONT * 1.36 + 10 };
// Left of the MQ2, its smoke drifting onto the mesh head.
const BIN = { x: -150, y: 300 };

const fireDetectorNrf52840: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('firen', PANEL, { note: '115200', cableTo: USB.nrf52840, wrap: true, fontSize: FONT })}${fireHtml('fdn', BIN)}
      ${glow('fdnir', { tone: 'heat', scale: 1.2 })}`,
    bounds: [PANEL.x, PANEL.y, 0, BIN.y + 80],
  },
  activity: [{ wires: ['w0', 'w1'], at: CHECKS }],
  run(t, view) {
    const head = view.box('GAS1');
    runFire(view, 'fdn', t, BIN, { x: head.x + 44.6, y: head.y + 38.5 }, {
      led: ['w12', 'w13'],
      buzzer: ['w10'],
      smoke: ['w6', 'w7', 'w8'],
    });
    // The IR thermometer warms while the bin blazes.
    const ir = view.box('IR1');
    setGlow(view, 'fdnir', { x: ir.x + ir.w / 2, y: ir.y + ir.h / 2 }, flareAt(t));
    showSerial(view, 'firen', t, PRINTS);
  },
};

export default fireDetectorNrf52840;

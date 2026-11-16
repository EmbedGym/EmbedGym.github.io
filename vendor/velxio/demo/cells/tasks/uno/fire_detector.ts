import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial } from '../../kit';
import { CHECKS, DURATION, fireHtml, printsFor, runFire } from '../mega/fire_detector';

// The Uno sketch reads the MQ2 on A0 (10-bit, 5 V) and prints each reading
// before announcing a status change.
const PRINTS = printsFor((volts) => Math.floor((volts * 1024) / 5), false);
const FONT = 28;
const PANEL = { x: -400, y: -80, w: 380, h: 34 + 5 * FONT * 1.36 + 10 };
// Left of the MQ2, its smoke drifting onto the mesh head.
const BIN = { x: -320, y: 210 };

const fireDetectorUno: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('fireu', PANEL, { note: '115200', cableTo: USB.uno, wrap: true, fontSize: FONT })}${fireHtml('fdu', BIN)}`,
    bounds: [PANEL.x, PANEL.y, 285, 310],
  },
  activity: [{ wires: ['w-SDA', 'w-SCL'], at: CHECKS }],
  run(t, view) {
    const head = view.box('GAS1');
    runFire(view, 'fdu', t, BIN, { x: head.x + 44.6, y: head.y + 38.5 }, {
      led: ['w-12-resistor', 'w-resistor-LED'],
      buzzer: ['w-9-BZ1'],
      smoke: ['w-A0-AO'],
    });
    showSerial(view, 'fireu', t, PRINTS, { board: 'arduino-uno' });
  },
};

export default fireDetectorUno;

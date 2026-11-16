import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial } from '../../kit';
import { DURATION, PRINTS, READS, ledOn, showPane, windowSvg } from '../mega/surface_condensation_risk';

type Led = HTMLElement & { value: boolean };

const FONT = 30;
const PANEL = { x: -400, y: 40, w: 372, h: 34 + 4 * FONT * 1.36 + 10 };
const WINDOW = { x: 380, y: 191 };
// The IR thermometer's field of view, from its lens to the pane.
const BEAM = `348,218 348,230 ${WINDOW.x},${WINDOW.y + 66} ${WINDOW.x},${WINDOW.y}`;

const surfaceCondensationRiskUno: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-scu-window { position: absolute; left: ${WINDOW.x}px; top: ${WINDOW.y}px; }
      </style>
      ${serialPanel('condensation-u', PANEL, { note: '115200', cableTo: USB.uno, wrap: true, fontSize: FONT })}
      <svg class="cell-air" viewBox="0 0 10 10">
        <defs>
          <linearGradient id="c-scu-beam" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stop-color="#f97316" stop-opacity="0.55" />
            <stop offset="1" stop-color="#f97316" stop-opacity="0.2" />
          </linearGradient>
        </defs>
        <polygon points="${BEAM}" fill="url(#c-scu-beam)" />
      </svg>
      <div class="c-scu-window">${windowSvg('c-scu')}</div>`,
    bounds: [PANEL.x, PANEL.y, WINDOW.x + 52, WINDOW.y + 66],
  },
  activity: [{ wires: ['w-2-DATA', 'w-A4-SDA', 'w-A5-SCL'], at: READS }],
  run(t, view) {
    showPane(view, 'c-scu', t);
    const on = ledOn(t);
    view.part<Led>('L1').value = on;
    if (on) {
      view.glowWire('w-3-R_LED', 1);
      view.glowWire('w-R_LED-L1', 1);
    }
    showSerial(view, 'condensation-u', t, PRINTS, { board: 'arduino-uno' });
  },
};

export default surfaceCondensationRiskUno;

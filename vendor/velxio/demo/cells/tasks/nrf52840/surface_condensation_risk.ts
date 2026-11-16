import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial } from '../../kit';
import { DURATION, PRINTS, READS, ledOn, showPane, windowSvg } from '../mega/surface_condensation_risk';

type Led = HTMLElement & { value: boolean };

const FONT = 37;
const PANEL = { x: -496, y: -10, w: 466, h: 34 + 4 * FONT * 1.36 + 10 };
// Left of the IR thermometer, above the panel.
const WINDOW = { x: -150, y: -160 };
// The IR thermometer's field of view, from its lens to the pane.
const BEAM = `-62,-132 -62,-120 ${WINDOW.x + 52},${WINDOW.y + 66} ${WINDOW.x + 52},${WINDOW.y}`;

const surfaceCondensationRiskNrf52840: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-scn-window { position: absolute; left: ${WINDOW.x}px; top: ${WINDOW.y}px; }
      </style>
      ${serialPanel('condensation-n', PANEL, { note: '115200', cableTo: USB.nrf52840, wrap: true, fontSize: FONT })}
      <svg class="cell-air" viewBox="0 0 10 10">
        <defs>
          <linearGradient id="c-scn-beam" x1="1" x2="0" y1="0" y2="0">
            <stop offset="0" stop-color="#f97316" stop-opacity="0.55" />
            <stop offset="1" stop-color="#f97316" stop-opacity="0.2" />
          </linearGradient>
        </defs>
        <polygon points="${BEAM}" fill="url(#c-scn-beam)" />
      </svg>
      <div class="c-scn-window">${windowSvg('c-scn')}</div>`,
    bounds: [PANEL.x, WINDOW.y, 0, PANEL.y + PANEL.h],
  },
  activity: [{ wires: ['w-P1.02-DATA', 'w-P0.21-SDA', 'w-P0.27-SCL'], at: READS }],
  run(t, view) {
    showPane(view, 'c-scn', t);
    const on = ledOn(t);
    view.part<Led>('L1').value = on;
    if (on) {
      view.glowWire('w-P1.15-R_LED', 1);
      view.glowWire('w-R_LED-L1', 1);
    }
    showSerial(view, 'condensation-n', t, PRINTS);
  },
};

export default surfaceCondensationRiskNrf52840;

import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial } from '../../kit';
import { DURATION, PRINTS, READS, ledOn, showPane, windowSvg } from '../mega/surface_condensation_risk';

type Led = HTMLElement & { value: boolean };

const FONT = 40;
const PANEL_H = 34 + 4 * FONT * 1.36 + 10;
// Left of the LED, ending level with the 5V run under the board.
const PANEL = { x: -636, y: 434 - PANEL_H, w: 504, h: PANEL_H };
// Under the board, left of the IR thermometer's body.
const WINDOW = { x: 80, y: 358 };
// The IR thermometer's field of view, from its lens to the pane.
const BEAM = `166,374 166,386 ${WINDOW.x + 52},${WINDOW.y + 66} ${WINDOW.x + 52},${WINDOW.y}`;

const surfaceCondensationRiskEsp32s3: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-sce-window { position: absolute; left: ${WINDOW.x}px; top: ${WINDOW.y}px; }
      </style>
      ${serialPanel('condensation-e', PANEL, { note: '115200', cableTo: USB.esp32s3, wrap: true, fontSize: FONT })}
      <svg class="cell-air" viewBox="0 0 10 10">
        <defs>
          <linearGradient id="c-sce-beam" x1="1" x2="0" y1="0" y2="0">
            <stop offset="0" stop-color="#f97316" stop-opacity="0.55" />
            <stop offset="1" stop-color="#f97316" stop-opacity="0.2" />
          </linearGradient>
        </defs>
        <polygon points="${BEAM}" fill="url(#c-sce-beam)" />
      </svg>
      <div class="c-sce-window">${windowSvg('c-sce')}</div>`,
    bounds: [PANEL.x, PANEL.y, WINDOW.x + 52, PANEL.y + PANEL.h],
  },
  activity: [{ wires: ['w-14-DATA', 'w-38-SDA', 'w-39-SCL'], at: READS }],
  run(t, view) {
    showPane(view, 'c-sce', t);
    const on = ledOn(t);
    view.part<Led>('L1').value = on;
    if (on) {
      view.glowWire('w-10-R_LED', 1);
      view.glowWire('w-R_LED-L1', 1);
    }
    showSerial(view, 'condensation-e', t, PRINTS);
  },
};

export default surfaceCondensationRiskEsp32s3;

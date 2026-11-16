import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial } from '../../kit';
import { chartSize, DURATION, PRINTS, SAMPLES, stepScene } from '../uno/step_counter_print';

// The ESP-IDF firmware samples GPIO38/39 on a 50 ms esp_timer and prints the same lines.
const FONT = 28;
const CHART = chartSize(FONT);
// Left of the board, the chart above the monitor; the monitor ends above the console socket, so its
// cable leaves the bottom and comes up into the socket from below. Two readings: 34 + 2 x 38.1 + 10.
const SCENE = stepScene('se', { x: -351, y: -6 }, FONT, 'right');
const PANEL = { x: -351, y: -6 + CHART.h + 16, w: CHART.w, h: 120 };
// The cable's run under the plug (kit.ts: 20 px below the socket's 362).
const CABLE_BOTTOM = 384;
// The shake marks reach 34 px right of the module (right edge 226.4).
const MARKS_RIGHT = 262;

const stepCounterPrintEsp32s3: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('out', PANEL, { note: '115200', cableTo: USB.esp32s3, fontSize: FONT })}
      ${SCENE.html}`,
    bounds: [PANEL.x, -6, MARKS_RIGHT, CABLE_BOTTOM],
  },
  activity: [{ wires: ['w-38-SDA', 'w-39-SCL'], at: SAMPLES }],
  run(t, view) {
    SCENE.run(view, t);
    showSerial(view, 'out', t, PRINTS, { fadeFrom: DURATION - 300 });
  },
};

export default stepCounterPrintEsp32s3;

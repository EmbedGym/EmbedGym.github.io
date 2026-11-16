import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial } from '../../kit';
import { chartSize, DURATION, PRINTS, SAMPLES, stepScene } from '../uno/step_counter_print';

// The Zephyr firmware samples P0.21/P0.27 on a 50 ms k_timer and prints the same lines.
// The card is wide (the monitor left of the 516 px board), so the text is larger.
const FONT = 32;
const CHART = chartSize(FONT);
// Two readings, one row each: 34 + 2 x 43.5 + 10.
const PANEL = { x: -20 - CHART.w, y: 30, w: CHART.w, h: 131 };
// Above the monitor.
const CHART_Y = PANEL.y - 16 - CHART.h;
const SCENE = stepScene('sn', { x: PANEL.x, y: CHART_Y }, FONT, 'right');

const stepCounterPrintNrf52840: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('out', PANEL, { note: '115200', cableTo: USB.nrf52840, fontSize: FONT })}
      ${SCENE.html}`,
    bounds: [PANEL.x, CHART_Y, 516, 248],
  },
  activity: [{ wires: ['w-P0.21-SDA', 'w-P0.27-SCL'], at: SAMPLES }],
  run(t, view) {
    SCENE.run(view, t);
    showSerial(view, 'out', t, PRINTS, { fadeFrom: DURATION - 300 });
  },
};

export default stepCounterPrintNrf52840;

import { clamp } from '../../anim';
import type { Cell, CellView } from '../../cell';
import { flame, runFlame } from '../../decor/flame';
import { puffs, runPuffs } from '../../decor/puffs';
import { USB, serialPanel, showSerial, type Print } from '../../kit';

// A candle beside the sensor is blown out, and its smoke drifts into the
// sensor's inlet. The sketch prints PM1.0, PM2.5 and PM10 once a second, so the
// test's clean-air 8/12/20 jumps to its smoky 35/75/150, then falls back as the
// smoke clears. The candle is relit before the loop repeats.
export const DURATION = 6000;
export const READS = [200, 1200, 2200, 3200, 4200, 5200];
const PM: [number, number, number][] = [
  [8, 12, 20],
  [8, 12, 20],
  [35, 75, 150],
  [35, 75, 150],
  [22, 46, 90],
  [12, 20, 36],
];
const OUT_AT = 900;
const RELIT_AT = 5500;
// Smoke leaves the wick from OUT_AT until SMOKE_TO; each puff takes FLIGHT ms to reach the inlet.
const SMOKE_TO = 3000;
const FLIGHT = 1100;

const LOOP_PRINTS: Print[] = READS.map((t, i) => ({
  t: t + 30,
  // Each line wraps once, before "PM10:".
  text: `PM1.0:&nbsp;${PM[i][0]} PM2.5:&nbsp;${PM[i][1]} PM10:&nbsp;${PM[i][2]}`,
}));
// The previous loop's lines are already on screen at t=0, matching the end state.
export const PRINTS: Print[] = [...LOOP_PRINTS.map((p) => ({ ...p, t: p.t - DURATION })), ...LOOP_PRINTS];
const PANEL = { x: -350, y: -190, w: 330, h: 248 };

const CANDLE = { x: 120, y: -130 };
const WICK = { x: CANDLE.x + 17, y: CANDLE.y + 30 };
// The inlet is the dark window in the module's top-left corner, relative to its box.
export const INLET = { dx: 46, dy: 35 };
const PUFFS = 36;

/** The flame goes out at OUT_AT and is relit at RELIT_AT; smoke drifts from the wick into the inlet meanwhile. */
export function runCandle(view: CellView, t: number, wick: { x: number; y: number }, inlet: { x: number; y: number }) {
  runFlame(view, 'candle', t, t < OUT_AT ? 1 : clamp((t - RELIT_AT) / 250));
  runPuffs(view, 'smoke', t, { from: wick, to: inlet, window: [OUT_AT, SMOKE_TO], flight: FLIGHT, size: [4, 11], spread: 16, lift: 30, opacity: 0.55, seed: 7 });
}

export const candleSvg = `
  <svg viewBox="0 0 34 100" width="34" height="100" overflow="visible">
    <path d="M 17 30 V 38" stroke="#334155" stroke-width="2"/>
    <rect x="5" y="36" width="24" height="56" rx="3" fill="#fef3c7" stroke="#d6b36a" stroke-width="2"/>
    <rect x="0" y="90" width="34" height="8" rx="3" fill="#94a3b8"/>
  </svg>`;

const airQualityRead: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-aq-candle { position: absolute; left: ${CANDLE.x}px; top: ${CANDLE.y}px; }
      </style>
      ${serialPanel('out', PANEL, { note: '115200', cableTo: USB.mega, wrap: true })}
      <div class="c-aq-candle">${candleSvg}</div>
      <div style="position:absolute;left:${WICK.x}px;top:${WICK.y}px">${flame('candle')}</div>
      ${puffs('smoke', PUFFS, 'smoke')}`,
    bounds: [PANEL.x, PANEL.y, CANDLE.x + 34, PANEL.y + PANEL.h],
  },
  activity: [{ wires: ['w-20-SDA', 'w-21-SCL'], at: READS }],
  run(t, view) {
    // The smoke leaves the wick, rises, then drifts right into the inlet.
    const box = view.box('AIR1');
    runCandle(view, t, WICK, { x: box.x + INLET.dx, y: box.y + INLET.dy });

    showSerial(view, 'out', t, PRINTS, { board: 'arduino-mega' });
  },
};

export default airQualityRead;

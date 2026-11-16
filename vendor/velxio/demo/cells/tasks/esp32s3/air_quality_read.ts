import type { Cell } from '../../cell';
import { flame } from '../../decor/flame';
import { puffs } from '../../decor/puffs';
import { USB, serialPanel, showSerial } from '../../kit';
import { DURATION, INLET, PRINTS, READS, candleSvg, runCandle } from '../mega/air_quality_read';

const BOARD = 'esp32-s3';
const BUS = ['w-38-SDA', 'w-39-SCL'];

// Under the console socket and the sensor's wires: two readings, one row each.
const PANEL = { x: -60, y: 428, w: 800, h: 176 };
// Right of the sensor, its wick lower than the inlet.
const CANDLE = { x: 325, y: 270 };
const WICK = { x: CANDLE.x + 17, y: CANDLE.y + 30 };
const PUFFS = 36;

const airQualityReadEsp: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-aqe-candle { position: absolute; left: ${CANDLE.x}px; top: ${CANDLE.y}px; }
      </style>
      ${serialPanel('out', PANEL, { note: '115200', cableTo: USB.esp32s3, fontSize: 42 })}
      <div class="c-aqe-candle">${candleSvg}</div>
      <div style="position:absolute;left:${WICK.x}px;top:${WICK.y}px">${flame('candle')}</div>
      ${puffs('smoke', PUFFS, 'smoke')}`,
    bounds: [PANEL.x, PANEL.y, PANEL.x + PANEL.w, PANEL.y + PANEL.h],
  },
  activity: [{ wires: BUS, at: READS }],
  run(t, view) {
    // The smoke leaves the wick, rises, then drifts left into the inlet.
    const box = view.box('AIR1');
    runCandle(view, t, WICK, { x: box.x + INLET.dx, y: box.y + INLET.dy });
    showSerial(view, 'out', t, PRINTS, { board: BOARD });
  },
};

export default airQualityReadEsp;

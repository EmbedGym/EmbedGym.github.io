import type { Cell } from '../../cell';
import { flame } from '../../decor/flame';
import { puffs } from '../../decor/puffs';
import { USB, serialPanel, showSerial } from '../../kit';
import { DURATION, INLET, PRINTS, READS, candleSvg, runCandle } from '../mega/air_quality_read';

const BOARD = 'arduino-uno';
const BUS = ['w-A4-SDA', 'w-A5-SCL'];

// Two readings of 34 px text, each wrapping onto three rows.
const PANEL = { x: -304, y: -100, w: 280, h: 330 };
// Above the board, left of the sensor and lower than its inlet.
const CANDLE = { x: 150, y: -120 };
const WICK = { x: CANDLE.x + 17, y: CANDLE.y + 30 };
const PUFFS = 36;

const airQualityReadUno: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-aqu-candle { position: absolute; left: ${CANDLE.x}px; top: ${CANDLE.y}px; }
      </style>
      ${serialPanel('out', PANEL, { note: '115200', cableTo: USB.uno, wrap: true, fontSize: 34 })}
      <div class="c-aqu-candle">${candleSvg}</div>
      <div style="position:absolute;left:${WICK.x}px;top:${WICK.y}px">${flame('candle')}</div>
      ${puffs('smoke', PUFFS, 'smoke')}`,
    bounds: [PANEL.x, PANEL.y, CANDLE.x + 34, PANEL.y + PANEL.h],
  },
  activity: [{ wires: BUS, at: READS }],
  run(t, view) {
    // The smoke leaves the wick, rises, then drifts right into the inlet.
    const box = view.box('AIR1');
    runCandle(view, t, WICK, { x: box.x + INLET.dx, y: box.y + INLET.dy });
    showSerial(view, 'out', t, PRINTS, { board: BOARD });
  },
};

export default airQualityReadUno;

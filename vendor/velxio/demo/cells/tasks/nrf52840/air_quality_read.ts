import type { Cell } from '../../cell';
import { flame } from '../../decor/flame';
import { puffs } from '../../decor/puffs';
import { USB, serialPanel, showSerial } from '../../kit';
import { DURATION, INLET, PRINTS, READS, candleSvg, runCandle } from '../mega/air_quality_read';

const BOARD = 'nrf52840-dk';
const BUS = ['w-P0.21-SDA', 'w-P0.27-SCL'];

// Left of the DK at its console socket: two readings, each wrapping onto three rows.
const PANEL = { x: -330, y: -40, w: 280, h: 330 };
// Left of the sensor, its wick lower than the inlet.
const CANDLE = { x: -110, y: -150 };
const WICK = { x: CANDLE.x + 17, y: CANDLE.y + 30 };
const PUFFS = 36;

const airQualityReadNrf: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-aqn-candle { position: absolute; left: ${CANDLE.x}px; top: ${CANDLE.y}px; }
      </style>
      ${serialPanel('out', PANEL, { note: '115200', cableTo: USB.nrf52840, wrap: true, fontSize: 34 })}
      <div class="c-aqn-candle">${candleSvg}</div>
      <div style="position:absolute;left:${WICK.x}px;top:${WICK.y}px">${flame('candle')}</div>
      ${puffs('smoke', PUFFS, 'smoke')}`,
    bounds: [PANEL.x, CANDLE.y, CANDLE.x + 34, PANEL.y + PANEL.h],
  },
  activity: [{ wires: BUS, at: READS }],
  run(t, view) {
    // The smoke leaves the wick, rises, then drifts right into the inlet.
    const box = view.box('AIR1');
    runCandle(view, t, WICK, { x: box.x + INLET.dx, y: box.y + INLET.dy });
    showSerial(view, 'out', t, PRINTS, { board: BOARD });
  },
};

export default airQualityReadNrf;

import type { Cell } from '../../cell';
import { flame } from '../../decor/flame';
import { puffs } from '../../decor/puffs';
import { runServer, server, setServerLink, type ServerMessage } from '../../decor/server';
import { USB, serialPanel, showSerial, type Print } from '../../kit';
import { INLET, candleSvg, runCandle } from '../mega/air_quality_read';

type Led = HTMLElement & { value: boolean };

// Every 3 s the board reads its config row from PostgreSQL, reads the PMSA003I and SGP40, inserts a
// row and sets the alarm LED when PM2.5 is above the config's limit (20). The first cycle reads clean
// air (12); the candle's smoke reaches the inlet before the second (55), which lights the LED until
// the next loop's clean reading. Each cycle starts at its CYCLES time, before the SELECT leaves.
export const DURATION = 6000;
const CYCLES = [-1000, 2000];
const READ = 1600;
const DONE = 2550;
const PM25 = [12, 55];
const LIMIT = 20;

const LOOP_PRINTS: Print[] = CYCLES.map((s, i) => ({
  t: s + DONE,
  text: `ROW pm25=${PM25[i]} voc_raw=28000 alarm=${PM25[i] > LIMIT ? 1 : 0} interval=3 limit=${LIMIT}`,
}));
// The previous loop's lines are already on screen at t=0, matching the end state.
export const PRINTS: Print[] = [...LOOP_PRINTS.map((p) => ({ ...p, t: p.t - DURATION })), ...LOOP_PRINTS];
// A query arrives at the server at its `to` time; its reply leaves at its `from` time. A chip holds
// the lane for 950 ms, so three fit a 3 s cycle and the INSERT's short reply is left out.
const cycle = (s: number, pm25: number): ServerMessage[] => [
  { t: s + 600, text: 'SELECT config', dir: 'to' },
  { t: s + 950, text: `3 s, limit ${LIMIT}`, dir: 'from' },
  { t: s + 2500, text: `INSERT ${pm25}`, dir: 'to' },
];
// The neighbouring loops' cycles keep chips crossing the seam continuous.
export const QUERIES: ServerMessage[] = [-6000, 0, 6000].flatMap((k) => CYCLES.flatMap((s, i) => cycle(k + s, PM25[i])));
export const alarmOn = (t: number) => t >= CYCLES[1] + DONE || t < CYCLES[0] + DONE;
export const READS = CYCLES.map((s) => s + READ);

// The card is tall (the console socket is at the board's foot), so the text is larger.
const FONT = 44;
// Under the board and the sensor's wires; a row wraps once, before "interval": 34 + 2 x 59.8 + 10.
const SERIAL = { x: -125, y: 397, w: 980, h: 164 };
// The lane runs from the server to the WiFi access point (W1, right edge at 358), as long as the longest chip.
const REACH = 370;
const DB = { x: 372 + REACH, y: 79 };
const DB_W = 262;
// Right of the dust sensor, its wick lower than the inlet.
const CANDLE = { x: 325, y: 270 };
const WICK = { x: CANDLE.x + 17, y: CANDLE.y + 30 };
const PUFFS = 36;
const BUS = ['w-38-SDA', 'w-39-SCL', 'w-38-SDA2', 'w-39-SCL2'];

const pgAirLoggerEsp32s3: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('out', SERIAL, { note: '115200', cableTo: USB.esp32s3, wrap: true, fontSize: FONT })}
      ${server('pg', { ...DB, kind: 'database', label: 'PostgreSQL', fontSize: FONT, side: 'left', reach: REACH })}
      <div style="position:absolute;left:${CANDLE.x}px;top:${CANDLE.y}px">${candleSvg}</div>
      <div style="position:absolute;left:${WICK.x}px;top:${WICK.y}px">${flame('candle')}</div>
      ${puffs('smoke', PUFFS, 'smoke')}`,
    bounds: [SERIAL.x, -6, DB.x + DB_W, SERIAL.y + SERIAL.h],
  },
  activity: [{ wires: BUS, at: READS }],
  run(t, view) {
    const box = view.box('AIR1');
    runCandle(view, t, WICK, { x: box.x + INLET.dx, y: box.y + INLET.dy });
    setServerLink(view, 'pg', true);
    runServer(view, 'pg', t, QUERIES);
    const lit = alarmOn(t);
    view.part<Led>('L1').value = lit;
    ['w-10-R1', 'w-R1-L1'].forEach((id) => view.glowWire(id, lit ? 1 : 0));
    showSerial(view, 'out', t, PRINTS);
  },
};

export default pgAirLoggerEsp32s3;

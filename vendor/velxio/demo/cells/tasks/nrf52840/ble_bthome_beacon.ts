import { clamp } from '../../anim';
import type { Cell } from '../../cell';
import { flame, runFlame } from '../../decor/flame';
import { phone, phoneHeight, phoneWidth, setPhoneLink, setPhoneReadout } from '../../decor/phone';
import { puffs, runPuffs } from '../../decor/puffs';
import { candleSvg } from '../mega/air_quality_read';
import { airLane, runAir, FLIGHT, type Packet } from './ble_uart_console';

// A candle beside the sensor is blown out and its smoke drifts into the
// inlet. The board reads PM2.5 and PM10 every 2 s and puts them in the
// BTHome service data of its non-connectable advertisement; a scanning app
// shows them without ever connecting. Values are pairs the test sets: clean
// 91/111, smoky 516/777, clearing 244/739. The candle is relit before the
// loop repeats.

const I2C_WIRES = ['w-P0.21-SDA', 'w-P0.27-SCL'];

const DURATION = 6000;
const READS = [500, 2500, 4500];
const PM: [number, number][] = [
  [91, 111],
  [516, 777],
  [244, 739],
];
const OUT_AT = 900;
const RELIT_AT = 5300;
const SMOKE_TO = 3000;
const SMOKE_FLIGHT = 1100;
// Advertising events, drawn every 500 ms; each carries the data of the last read before it left.
const ADVERTS = Array.from({ length: 12 }, (_, i) => 100 + 500 * i);
const PACKETS: Packet[] = ADVERTS.map((t) => ({ t, dir: 'down', adv: true }));

/** The reading the advertisement leaving at `t` carries; before this loop's first read, the previous loop's last. */
const readingAt = (t: number) => {
  const i = READS.findLastIndex((r) => r <= t);
  return PM[i < 0 ? PM.length - 1 : i];
};

// Cell coordinates. The module (AIR1) sits left of the board, its pins facing it.
const FONT = 31;
const B1 = { x: -260, y: 150, w: 88, h: 70 };
const CANDLE = { x: -320, y: 50 };
const WICK = { x: CANDLE.x + 17, y: CANDLE.y + 30 };
// The inlet: the dark window, relative to the turned module's box.
const INLET = { dx: 35, dy: 98 };
const PHONE_W = phoneWidth(11, FONT);
const PHONE_H = phoneHeight({ fontSize: FONT, status: true, readout: 'PM2.5/PM10', note: true, rows: 0 });
const PHONE = { x: CANDLE.x - 16 - PHONE_W, y: Math.round(B1.y + B1.h / 2 - PHONE_H / 2), w: PHONE_W, h: PHONE_H };

const bleBthomeBeacon: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${phone('phone', { ...PHONE, fontSize: FONT, title: 'BLE-Air', status: true, readout: 'PM2.5/PM10', note: true, maxRows: 0 })}
      ${airLane('air', { x0: PHONE.x + PHONE.w, x1: B1.x, y: B1.y + B1.h / 2 })}
      <div style="position:absolute;left:${CANDLE.x}px;top:${CANDLE.y}px">${candleSvg}</div>
      <div style="position:absolute;left:${WICK.x}px;top:${WICK.y}px">${flame('candle')}</div>
      ${puffs('smoke', 36, 'smoke')}`,
    bounds: [PHONE.x, Math.min(PHONE.y, CANDLE.y - 40), B1.x + B1.w, PHONE.y + PHONE.h],
  },
  activity: [{ wires: I2C_WIRES, at: READS }],
  run(t, view) {
    runFlame(view, 'candle', t, t < OUT_AT ? 1 : clamp((t - RELIT_AT) / 250));
    const box = view.box('AIR1');
    runPuffs(view, 'smoke', t, { from: WICK, to: { x: box.x + INLET.dx, y: box.y + INLET.dy }, window: [OUT_AT, SMOKE_TO], flight: SMOKE_FLIGHT, size: [4, 11], spread: 16, lift: 30, opacity: 0.55, seed: 7 });

    setPhoneLink(view, 'phone', 'scanning', 'Advert only');
    runAir(view, 'air', t, PACKETS);
    // The phone shows the newest advertisement that has landed; at t=0 that is the previous loop's last.
    const landed = ADVERTS.findLast((a) => a + FLIGHT <= t) ?? ADVERTS[ADVERTS.length - 1] - DURATION;
    const [pm25, pm10] = readingAt(landed);
    const changed = landed + FLIGHT;
    const fresh = readingAt(landed - 500) !== readingAt(landed) ? 1 - (t - changed) / 500 : 0;
    setPhoneReadout(view, 'phone', `${pm25}/${pm10}`, fresh, { note: 'µg/m³' });
  },
};

export default bleBthomeBeacon;

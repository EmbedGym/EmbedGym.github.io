import type { Cell } from '../../cell';
import { phone, phoneHeight, phoneWidth, setPhoneButton, setPhoneLink, setPhoneReadout } from '../../decor/phone';
import { airLane, runAir, FLIGHT, type Packet } from './ble_uart_console';

// A phone app is connected to BLE-Log. The board reads the BME280 every 100 ms
// and keeps the last 200 readings. Tapping Dump writes 0x01 to the control
// characteristic; the board answers with the 200 stored records, oldest first,
// packed 61 to a notification (4-byte records in a 247-byte MTU): 61, 61, 61
// and 17, then the single byte 0x00 that ends the dump. The phone then shows
// the newest temperature (the test's -6.87 °C). Advertising and the connection
// happen before the loop, so it starts connected with the last dump on screen.

const DURATION = 6000;
const BUS = ['w-P0.21-SDA', 'w-P0.27-SCL'];
const READS = Array.from({ length: DURATION / 100 }, (_, k) => k * 100);
const NEWEST = 'newest -6.87 °C';
const RECORDS = 200;

const PRESS_AT = 1000;
const NOTIFY_AT = [1500, 1900, 2300, 2700];
const PER_NOTIFY = [61, 61, 61, 17];
const END_AT = 3100;
const ENDED_AT = END_AT + FLIGHT;
const END_NOTE_MS = 800;
const PACKETS: Packet[] = [
  { t: PRESS_AT, dir: 'up' },
  ...[...NOTIFY_AT, END_AT].map((t): Packet => ({ t, dir: 'down' })),
];

// Cell coordinates: the radio (B1) left of the board's power wire, the phone left of it.
const FONT = 36;
const B1 = { x: -114, y: 96, w: 88, h: 70 };
const PARTS = { fontSize: FONT, status: true, readout: 'Records', note: true, button: 'Dump' };
const PHONE_W = phoneWidth(NEWEST.length, FONT);
const PHONE_H = phoneHeight({ ...PARTS, rows: 0 });
const PHONE = { x: B1.x - 60 - PHONE_W, y: Math.round(B1.y + B1.h / 2 - PHONE_H / 2), w: PHONE_W, h: PHONE_H };

/** Records received at `t`, the last notification's size and when it landed. */
function received(t: number): [number, number, number] {
  let count = 0;
  let last = 0;
  let at = PRESS_AT + FLIGHT;
  NOTIFY_AT.forEach((n, i) => {
    if (t >= n + FLIGHT) {
      count += PER_NOTIFY[i];
      last = PER_NOTIFY[i];
      at = n + FLIGHT;
    }
  });
  return [count, last, at];
}

const bleDataLogger: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${phone('phone', { ...PHONE, ...PARTS, title: 'BLE-Log', maxRows: 0 })}
      ${airLane('air', { x0: PHONE.x + PHONE.w, x1: B1.x, y: B1.y + B1.h / 2 })}`,
    bounds: [PHONE.x, PHONE.y, 516, PHONE.y + PHONE.h],
  },
  activity: [{ wires: BUS, at: READS }],
  run(t, view) {
    setPhoneLink(view, 'phone', 'connected');
    setPhoneButton(view, 'phone', t >= PRESS_AT && t < PRESS_AT + 200 ? 1 : 0);
    runAir(view, 'air', t, PACKETS);
    // From the write landing until the 0x00 lands the count restarts; otherwise the last dump shows.
    if (t >= PRESS_AT + FLIGHT && t < ENDED_AT) {
      const [count, last, at] = received(t);
      setPhoneReadout(view, 'phone', String(count), 1 - (t - at) / 400, { note: last ? `+${last} records` : 'receiving…' });
    } else if (t >= ENDED_AT && t < ENDED_AT + END_NOTE_MS) {
      setPhoneReadout(view, 'phone', String(RECORDS), 0, { note: 'end (0x00)' });
    } else {
      setPhoneReadout(view, 'phone', String(RECORDS), 0, { note: NEWEST });
    }
  },
};

export default bleDataLogger;

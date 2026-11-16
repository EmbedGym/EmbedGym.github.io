import type { Cell } from '../../cell';
import { phone, phoneHeight, phoneWidth, setPhoneLink, setPhoneReadout } from '../../decor/phone';
import { runSpray, spray } from '../../decor/spray';
import { airLane, runAir, FLIGHT, type Packet } from './ble_uart_console';

// An Environmental Sensing app is connected to BLE-Env with notifications on. Once a second the board
// reads the BME280 and notifies temperature, humidity and pressure. A mister sprays the sensor: the
// humidity jumps from the test's 37.55 % to its 71.06 %, then dries back through its 52.42 %. The
// temperature and pressure stay at the test's first values; the note shows them in turn. Advertising and the connection happen
// before the loop, so it starts connected.
const DURATION = 6000;
const READS = [500, 1500, 2500, 3500, 4500, 5500];
const HUMIDITY = ['37.55', '71.06', '71.06', '52.42', '37.55', '37.55'];
const SPRAY = 1200;
const BUS = ['w-P0.21-SDA', 'w-P0.27-SCL'];
// The three notifications of a reading leave together; one packet stands for them.
const PACKETS: Packet[] = READS.map((t) => ({ t, dir: 'down' }));

// Cell coordinates: the radio (B1) left of the board's power wire, the phone left of it, the mister
// above the phone, left of the sensor.
const FONT = 34;
const B1 = { x: -120, y: 90, w: 88, h: 70 };
const PHONE_W = phoneWidth(12, FONT);
const PHONE_H = phoneHeight({ fontSize: FONT, status: true, readout: 'Humidity', note: true, rows: 0 });
const PHONE = { x: B1.x - 60 - PHONE_W, y: Math.round(B1.y + B1.h / 2 - PHONE_H / 2), w: PHONE_W, h: PHONE_H };
const BOTTLE = { x: -150, y: -100 };

const bleEnvSensorNrf52840: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${phone('phone', { ...PHONE, fontSize: FONT, title: 'BLE-Env', status: true, readout: 'Humidity', note: true, maxRows: 0 })}
      ${airLane('air', { x0: PHONE.x + PHONE.w, x1: B1.x, y: B1.y + B1.h / 2 })}
      ${spray('mister')}`,
    bounds: [PHONE.x, -118, 516, PHONE.y + PHONE.h],
  },
  activity: [{ wires: BUS, at: READS }],
  run(t, view) {
    runSpray(view, 'mister', BOTTLE, t, [SPRAY], { reach: view.box('ENV1').x - 18 - (BOTTLE.x + 62) });
    setPhoneLink(view, 'phone', 'connected');
    runAir(view, 'air', t, [...PACKETS, { t: READS[READS.length - 1] - DURATION, dir: 'down' }]);
    // The previous loop's last notification is on screen until the first lands.
    const shown = READS.findLastIndex((r) => r + FLIGHT <= t);
    const i = shown === -1 ? READS.length - 1 : shown;
    const since = shown === -1 ? t + DURATION - READS[i] - FLIGHT : t - READS[i] - FLIGHT;
    // The note alternates between the other two characteristics' notifications.
    setPhoneReadout(view, 'phone', `${HUMIDITY[i]} %`, 1 - since / 400, { note: i % 2 ? 'P 1008.64 hPa' : 'Temp -8.47 °C' });
  },
};

export default bleEnvSensorNrf52840;

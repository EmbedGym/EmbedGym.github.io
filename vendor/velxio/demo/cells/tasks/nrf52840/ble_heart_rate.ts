import type { Cell } from '../../cell';
import { finger, pressFinger } from '../../decor/finger';
import { phone, phoneHeight, phoneWidth, setPhoneLink, setPhoneReadout, type PhoneLink } from '../../decor/phone';
import { airLane, runAir, type Packet } from './ble_uart_console';

// A heart rate app connects to BLE-HR and turns on Heart Rate Measurement
// notifications. The board reads the MAX32664 every second and notifies each
// reading: 64 bpm (the test's first rate) with sensor contact while the finger
// rests on the window, and with contact not detected once it lifts (the test's
// status 2). The finger returns, then the phone hangs up and the board
// advertises again, which is how the loop starts. The hub's reset and mode
// setup run once at power-on and are not looped.

const I2C_WIRES = ['w-P0.21-SDA', 'w-P0.27-SCL'];
const BPM = 64;

const DURATION = 6000;
const CONNECT_AT = 400;
const HANG_UP_AT = 5300;
const SCAN_AGAIN_AT = 5600;
const READS = [800, 1800, 2800, 3800, 4800, 5800];
const LIFT_AT = 2300;
const BACK_AT = 4300;

const contactAt = (t: number) => t < LIFT_AT || t >= BACK_AT;
const NOTIFIES = READS.filter((t) => t >= CONNECT_AT && t < HANG_UP_AT);
const PACKETS: Packet[] = [
  ...[0, 250, SCAN_AGAIN_AT, DURATION - 250].map((t): Packet => ({ t, dir: 'down', adv: true })),
  ...NOTIFIES.map((t): Packet => ({ t, dir: 'down' })),
];
// A notification shows on the phone when its packet lands.
const FLIGHT = 250;

// Cell coordinates: the radio (B1) under the sensor, left of the power wires; the phone left of it.
const FONT = 27;
const B1 = { x: -170, y: 96, w: 88, h: 70 };
const PHONE_W = phoneWidth(13, FONT);
const PHONE_H = phoneHeight({ fontSize: FONT, status: true, readout: '♥ Heart rate', note: true, rows: 0 });
const PHONE = { x: B1.x - 50 - PHONE_W, y: Math.round(B1.y + B1.h / 2 - PHONE_H / 2), w: PHONE_W, h: PHONE_H };
// The sensor window on the module, relative to its box.
const WINDOW_AT = { dx: 55, dy: 30 };

function link(t: number): [PhoneLink, string | undefined] {
  if (t < CONNECT_AT || t >= SCAN_AGAIN_AT) return ['scanning', undefined];
  if (t < HANG_UP_AT) return ['connected', undefined];
  return ['idle', 'Disconnected'];
}

const bleHeartRate: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${phone('phone', { ...PHONE, fontSize: FONT, title: 'BLE-HR', status: true, readout: '♥ Heart rate', note: true, maxRows: 0 })}
      ${airLane('air', { x0: PHONE.x + PHONE.w, x1: B1.x, y: B1.y + B1.h / 2 })}
      ${finger('f', { rotate: 270 })}`,
    bounds: [PHONE.x, PHONE.y, B1.x + B1.w, PHONE.y + PHONE.h],
  },
  activity: [{ wires: I2C_WIRES, at: READS }],
  run(t, view) {
    const box = view.box('BIO1');
    pressFinger(view, 'f', t, { x: box.x + WINDOW_AT.dx, y: box.y + WINDOW_AT.dy }, [[-1, LIFT_AT], [BACK_AT, DURATION + 1]], { lift: 44 });

    const [state, text] = link(t);
    setPhoneLink(view, 'phone', state, text);
    runAir(view, 'air', t, PACKETS);

    const shown = NOTIFIES.findLast((n) => n + FLIGHT <= t);
    if (state !== 'connected' || shown === undefined) {
      setPhoneReadout(view, 'phone', '--', 0, { note: ' ', dim: true });
    } else {
      const contact = contactAt(shown);
      setPhoneReadout(view, 'phone', `${BPM} bpm`, 1 - (t - shown - FLIGHT) / 400, { note: contact ? 'Sensor contact' : 'No contact', dim: !contact });
    }
  },
};

export default bleHeartRate;

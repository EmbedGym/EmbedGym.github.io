import type { Cell } from '../../cell';
import { finger, pressFinger } from '../../decor/finger';
import { phone, phoneHeight, phoneWidth, setPhoneLink, setPhoneReadout } from '../../decor/phone';
import { airLane, runAir, FLIGHT, type Packet } from './ble_uart_console';

// A Health Thermometer app is connected to BLE-Therm with indications on. A fingertip rests on the
// DS18B20, which reads the test's 36.5 °C. Every 2 s the board reads it and indicates the
// Temperature Measurement; the phone confirms each indication, and the board sends the next only
// after the confirmation. Advertising and the connection happen before the loop, so it starts connected.
const DURATION = 6000;
const READS = [500, 2500, 4500];
const BUS = ['w-P0.03-data'];
// Each reading: the indication down, then the phone's confirmation back as it lands.
const PACKETS: Packet[] = [...READS, READS[READS.length - 1] - DURATION].flatMap((t): Packet[] => [
  { t, dir: 'down' },
  { t: t + FLIGHT, dir: 'up' },
]);

// Cell coordinates: the radio (B1) above the probe, left of the board; the phone left of them; the
// fingertip under the probe.
const FONT = 34;
const B1 = { x: -120, y: 20, w: 88, h: 70 };
const PHONE_W = phoneWidth(12, FONT);
const PHONE_H = phoneHeight({ fontSize: FONT, status: true, readout: 'Temperature', note: true, rows: 0 });
const PHONE = { x: B1.x - 60 - PHONE_W, y: Math.round(B1.y + B1.h / 2 - PHONE_H / 2), w: PHONE_W, h: PHONE_H };
// The probe's box is (-140, 124) 76 x 60; the pad rests on the middle of its underside.
const PAD = { x: -102, y: 186 };
const FINGER_LENGTH = 96;

const bleHealthThermometerNrf52840: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${phone('phone', { ...PHONE, fontSize: FONT, title: 'BLE-Therm', status: true, readout: 'Temperature', note: true, maxRows: 0 })}
      ${airLane('air', { x0: PHONE.x + PHONE.w, x1: B1.x, y: B1.y + B1.h / 2 })}
      ${finger('f', { rotate: 180, length: FINGER_LENGTH })}`,
    // Cropped just right of the header the probe uses; the rest of the board runs off the card.
    bounds: [PHONE.x, PHONE.y, 210, Math.max(248, PAD.y + FINGER_LENGTH)],
  },
  activity: [{ wires: BUS, at: READS.map((t) => t - 20) }],
  run(t, view) {
    pressFinger(view, 'f', t, PAD, [[-1, DURATION + 1]]);
    setPhoneLink(view, 'phone', 'connected');
    runAir(view, 'air', t, PACKETS);
    // The newest indication that has landed; before the first, the previous loop's last.
    const landed = READS.findLast((r) => r + FLIGHT <= t) ?? READS[READS.length - 1] - DURATION;
    const since = t - landed - FLIGHT;
    setPhoneReadout(view, 'phone', '36.5 °C', 1 - since / 400, { note: since >= FLIGHT ? 'Confirmed' : 'Indicated' });
  },
};

export default bleHealthThermometerNrf52840;

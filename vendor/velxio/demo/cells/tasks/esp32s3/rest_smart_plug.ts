import type { Cell } from '../../cell';
import { batteryPart } from '../../decor/battery';
import { GREEN } from '../../decor/common';
import { glow } from '../../decor/glow';
import { phone, phoneHeight, phoneWidth, runPhone, setPhoneLink, type PhoneMessage } from '../../decor/phone';
import { lampLevel, lampPart, setLamp } from '../nrf52840/ble_smart_plug';

// Board-specific names.
const RELAY = 'RLY1';
const RELAY_WIRE = 'w-21-IN';
const BUS = ['w-38-SDA', 'w-39-SCL'];
const LOAD_WIRES = ['load-no', 'load-ret', 'load-com'];

type Relay = HTMLElement & { energized: boolean };

// The board runs the HTTP server; the phone (peer.py) is the client. It GETs
// /api/status, POSTs "on" (relay on), the unexpected "up" (400, relay
// unchanged) and "off", then GETs /api/history: the two switches so far,
// oldest first, each with its seq and the temperature at the time. The
// BME280 is read every 2 s; the room stays at 23.5 °C, 41.4 %.
const DURATION = 6000;
const STATUS = 300;
const ON = 1400;
const BAD = 2600;
const OFF = 3600;
const HISTORY = 4700;
const REPLY = 350;
const LANDS = 50;
const FADE_FROM = 5700;
const SWITCHES = [ON + LANDS, OFF + LANDS];
const READS = [200, 2200, 4200];

// A POST's body follows its request line as a second bubble.
const post = (t: number, body: string): PhoneMessage[] => [
  { t, text: 'POST /api/relay', from: 'out' },
  { t: t + 1, text: body, from: 'out' },
];
const CHAT: PhoneMessage[] = [
  { t: STATUS, text: 'GET /api/status', from: 'out' },
  { t: STATUS + REPLY, text: '200 off 23.5°C 41.4%', from: 'in' },
  ...post(ON, 'on'),
  { t: ON + REPLY, text: '200 on 23.5°C 41.4%', from: 'in' },
  ...post(BAD, 'up'),
  { t: BAD + REPLY, text: '400', from: 'in' },
  ...post(OFF, 'off'),
  { t: OFF + REPLY, text: '200 off 23.5°C 41.4%', from: 'in' },
  { t: HISTORY, text: 'GET /api/history', from: 'out' },
  { t: HISTORY + REPLY, text: '200 1 on 23.5°C', from: 'in' },
  { t: HISTORY + REPLY + 1, text: '2 off 23.5°C', from: 'in' },
];

const F = 37;
// Cell coordinates: the relay (turned 90°) spans x 62.5..110.5, y 412.5..500.5,
// NO/COM on its top edge at x 96.5/86.5; IN's drop runs at x 140. The lamp's
// leads and the pack's (both out of its lower side) line up at y 388.
const LAMP = { x: 180, y: 326 };
const BATTERY = { x: 262, y: 354 };
// W1 spans x 300..388, y 120..190; the phone sits right of it, linked across a dashed lane.
const W1_EDGE = { x: 388, y: 155 };
const PHONE_PARTS = { fontSize: F };
const PHONE_W = phoneWidth(20, F);
const PHONE_H = phoneHeight({ ...PHONE_PARTS, rows: 3 });
const PHONE = { x: W1_EDGE.x + 50, y: W1_EDGE.y - PHONE_H / 2, w: PHONE_W, h: PHONE_H };

const restSmartPlugEsp32s3: Cell = {
  duration: DURATION,
  extras: {
    parts: [lampPart('LAMP', LAMP.x, LAMP.y), batteryPart('BAT', BATTERY.x, BATTERY.y, { leads: 'down' })],
    wires: [
      { id: 'load-no', from: [RELAY, 'NO'], to: ['BAT', 'pos'], color: '#ff0000', via: [{ x: 96.5, y: 400 }, { x: BATTERY.x + 62, y: 400 }] },
      { id: 'load-ret', from: ['BAT', 'neg'], to: ['LAMP', 'B'], color: '#000000' },
      { id: 'load-com', from: [RELAY, 'COM'], to: ['LAMP', 'A'], color: '#aa00ff', via: [{ x: 86.5, y: LAMP.y + 62 }] },
    ],
  },
  decor: {
    html: `
      ${glow('lamp', { tone: 'lamp', scale: 1.7 })}
      <div style="position:absolute;left:${W1_EDGE.x}px;top:${W1_EDGE.y - 1}px;width:${PHONE.x - W1_EDGE.x}px;border-top:2px dashed ${GREEN}"></div>
      ${phone('phone', { ...PHONE, ...PHONE_PARTS, title: 'Smart plug', radio: 'wifi', maxRows: 3 })}`,
    bounds: [LAMP.x, PHONE.y, PHONE.x + PHONE.w, PHONE.y + PHONE.h],
  },
  activity: [{ wires: BUS, at: READS.flatMap((r) => [r, r + 40]) }],
  run(t, view) {
    const level = lampLevel(t, SWITCHES);
    const on = SWITCHES.filter((s) => s <= t).length % 2 === 1;
    view.part<Relay>(RELAY).energized = on;
    view.glowWire(RELAY_WIRE, on ? 1 : 0);
    for (const id of LOAD_WIRES) view.glowWire(id, 0.6 * level);
    setLamp(view, 'LAMP', 'lamp', LAMP, level);

    setPhoneLink(view, 'phone', true);
    runPhone(view, 'phone', t, CHAT, FADE_FROM);
  },
};

export default restSmartPlugEsp32s3;

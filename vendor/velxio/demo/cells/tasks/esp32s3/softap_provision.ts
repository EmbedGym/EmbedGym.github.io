import { clamp, lerp } from '../../anim';
import type { Cell } from '../../cell';
import { GREEN, MUTED } from '../../decor/common';
import { phone, phoneHeight, phoneWidth, runPhone, setPhoneButton, setPhoneLink, type PhoneMessage } from '../../decor/phone';
import { chipWidth, runServer, server, serverSize, setServerLink, type ServerMessage } from '../../decor/server';
import { cloud, setCloud, setSun, sun } from '../../decor/sky';

// Board-specific names.
const BUS = ['w-38-SDA', 'w-39-SCL'];

// The board boots as the open AP Velxio-Setup. The phone joins it and POSTs
// /provision: interval=61 is out of range (400), interval=3 is accepted (200 OK).
// 600 ms after the reply the AP stops, the board joins Espressif, connects to
// the broker and publishes {"uv_index":x.xx} on garden/uv at once and then every
// 3 s, each from a fresh LTR390 reading (UVS count / 2300).
const DURATION = 6000;
const PRESSES: [number, number][] = [
  [20, 170],
  [720, 870],
];
const SENT = [100, 800];
const REPLY = [350, 1050];
const AP_DOWN = REPLY[1] + 600;
const JOINED = AP_DOWN + 100;
const MQTT_UP = JOINED + 100;
const FLIGHT = 600;
// Each publish leaves right after its fresh read, 3 s apart.
const READS = [MQTT_UP, MQTT_UP + 3000];
const PUBLISH_AT = READS.map((t) => t + 50);
const FADE_FROM = 5700;

const CHAT: PhoneMessage[] = [
  { t: SENT[0], text: 'interval=61', from: 'out' },
  { t: REPLY[0], text: '400', from: 'in' },
  { t: SENT[1], text: 'interval=3', from: 'out' },
  { t: REPLY[1], text: '200 OK', from: 'in' },
];

// The cloud covers the sun between the two reads: UVS 580 -> 6.05, 250 -> 2.61.
const cover = (t: number) => clamp((t - 2900) / 1000) * (1 - clamp((t - FADE_FROM) / 300));
const PUBLISHES: ServerMessage[] = [
  { t: PUBLISH_AT[0] + FLIGHT, text: '{"uv_index":6.05}', dir: 'to' },
  { t: PUBLISH_AT[1] + FLIGHT, text: '{"uv_index":2.61}', dir: 'to' },
];

const F = 29;
// W1 (the Espressif router) sits above the phone; the broker's lane runs from it over the board's top end.
const W1 = { x: -122, y: -110, w: 88, h: 70 };
const REACH = chipWidth(17, F) + 16;
const BROKER = serverSize('MQTT broker', F);
const BROKER_AT = { x: W1.x + W1.w + REACH, y: W1.y + W1.h / 2 - BROKER.h / 2 };
const PHONE_PARTS = { fontSize: F, status: true, button: 'Provision' };
const PHONE_W = phoneWidth(11, F);
const PHONE_H = phoneHeight({ ...PHONE_PARTS, rows: 3 });
const PHONE = { x: -54 - PHONE_W, y: W1.y + W1.h + 10, w: PHONE_W, h: PHONE_H };
const AP_LINK = { x0: -54, x1: -6, y: 120 };
// The board's station link to W1: down from W1's bottom, right of the phone, into the board's left edge.
const STA_LINK = { x: -45, y0: W1.y + W1.h, y1: 80, x1: -6 };
const SUN = { x: 300, y: 139 };

const softapProvisionEsp32s3: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${phone('phone', { ...PHONE, ...PHONE_PARTS, title: 'Velxio-Setup', radio: 'wifi', maxRows: 3 })}
      <div data-c-sape-ap style="position:absolute;left:${AP_LINK.x0}px;top:${AP_LINK.y - 1}px;width:${AP_LINK.x1 - AP_LINK.x0}px;border-top:2px dashed ${MUTED}"></div>
      <svg style="position:absolute;left:0;top:0;overflow:visible" width="1" height="1">
        <path data-c-sape-sta-link d="M ${STA_LINK.x} ${STA_LINK.y0} V ${STA_LINK.y1} H ${STA_LINK.x1}" fill="none" stroke-width="2" stroke-dasharray="6 5" />
      </svg>
      ${server('mqtt', { ...BROKER_AT, kind: 'broker', label: 'MQTT broker', fontSize: F, side: 'left', reach: REACH })}
      <div data-c-sape-sta style="position:absolute;left:${W1.x + W1.w + 8}px;top:${W1.y + W1.h / 2 + 24}px;white-space:nowrap;font:600 ${F}px/1 var(--sans)"></div>
      ${sun('sun', { rays: 'uv' })}
      ${cloud('cloud')}`,
    bounds: [PHONE.x, W1.y, BROKER_AT.x + BROKER.w, PHONE.y + PHONE.h],
  },
  // read_fresh_uvs polls MAIN_STATUS every 10 ms until a conversion is ready (up to 100 ms), then reads the count.
  activity: [{ wires: BUS, at: READS.flatMap((r) => [r, r + 40, r + 80, r + 120]) }],
  run(t, view) {
    const apUp = t < AP_DOWN;
    // The status line shows the form's ssid field; its colour follows the AP link.
    setPhoneLink(view, 'phone', apUp, 'ssid=Espressif');
    view.q<HTMLElement>('[data-c-sape-ap]').style.borderColor = apUp ? GREEN : MUTED;
    setPhoneButton(view, 'phone', PRESSES.some(([down, up]) => t >= down && t < up) ? 1 : 0);
    runPhone(view, 'phone', t, CHAT, FADE_FROM);

    // Station state holds to the end and fades with the rest; t=0 is the next boot, back in AP mode.
    const sta = view.q<HTMLElement>('[data-c-sape-sta]');
    const joined = t >= JOINED;
    sta.textContent = t < AP_DOWN ? 'AP mode' : joined ? 'joined Espressif' : 'joining…';
    sta.style.color = joined ? GREEN : MUTED;
    sta.style.opacity = String(t < AP_DOWN ? 1 : 1 - clamp((t - FADE_FROM) / 300));
    const linksUp = t < FADE_FROM + 150;
    view.q<SVGPathElement>('[data-c-sape-sta-link]').setAttribute('stroke', joined && linksUp ? GREEN : MUTED);
    setServerLink(view, 'mqtt', t >= MQTT_UP && linksUp);
    runServer(view, 'mqtt', t, PUBLISHES);

    const c = cover(t);
    setSun(view, 'sun', SUN, { brightness: 1 - 0.85 * c, turn: (t / DURATION) * 45 });
    setCloud(view, 'cloud', { x: lerp(SUN.x + 40, SUN.x, clamp((t - 2900) / 1000)), y: SUN.y }, c);
  },
};

export default softapProvisionEsp32s3;

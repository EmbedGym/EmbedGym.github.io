import { clamp, easeInOutCubic } from '../../anim';
import type { Cell } from '../../cell';
import { BLUE, FACE, GOLD, GREEN, METAL, METAL_EDGE, MUTED, PHONE_RULE, SUN_EDGE, TEXT } from '../../decor/common';
import { finger, pressFinger } from '../../decor/finger';
import { glow, setGlow } from '../../decor/glow';
import { USB, serialPanel, showSerial, type Print } from '../../kit';

// Board-specific names.
const BUTTON = 'BTN';
const SIGNAL_WIRES = ['w-P1.11-BTN', 'w-P1.11-RPD'];

type Button = HTMLElement & { pressed: boolean };
type Packet = { t: number; text: string; dir: 'to' | 'from' };

// The board is the central; BLE-Bulb is the peripheral. Each press writes the
// opposite of the bulb's known state; the bulb notifies every change, its own
// (switched off at the bulb) included. Mid-loop the bulb drops the link and the
// board reconnects, subscribes and reads the state again.
const DURATION = 6000;
// Each chip flies 250 ms, waits 100 ms and fades over 100 ms; the next packet
// on the lane leaves only once the previous one has gone.
const FLIGHT = 250;
const LINGER = 100;
const GONE = FLIGHT + LINGER + 100;
const PRESSES: [number, number][] = [
  [250, 550],
  [2200, 2500],
  [4800, 5100],
];
const WRITE1 = 270;
const LOCAL_OFF = 1500;
const WRITE2 = 2220;
const DROP = 3250;
const RECONNECT = 3700;
const READ = 3900;
const WRITE3 = 4820;
const FADE_FROM = 5700;

const PACKETS: Packet[] = [
  { t: WRITE1, text: 'write 1', dir: 'to' },
  { t: WRITE1 + GONE, text: 'notify 1', dir: 'from' },
  { t: LOCAL_OFF, text: 'notify 0', dir: 'from' },
  { t: WRITE2, text: 'write 1', dir: 'to' },
  { t: WRITE2 + GONE, text: 'notify 1', dir: 'from' },
  { t: READ, text: 'read', dir: 'to' },
  { t: READ + GONE, text: '1', dir: 'from' },
  { t: WRITE3, text: 'write 0', dir: 'to' },
  { t: WRITE3 + GONE, text: 'notify 0', dir: 'from' },
];
const arrival = (p: Packet) => p.t + FLIGHT;

// "BULB ON/OFF" prints on every write acknowledgement, notification and read.
const PRINTS: Print[] = [
  { t: arrival(PACKETS[0]), text: 'BULB ON' },
  { t: arrival(PACKETS[1]), text: 'BULB ON' },
  { t: arrival(PACKETS[2]), text: 'BULB OFF' },
  { t: arrival(PACKETS[3]), text: 'BULB ON' },
  { t: arrival(PACKETS[4]), text: 'BULB ON' },
  { t: DROP, text: 'DISCONNECTED' },
  { t: RECONNECT, text: 'CONNECTED' },
  { t: RECONNECT + 150, text: 'SUBSCRIBED' },
  { t: arrival(PACKETS[6]), text: 'BULB ON' },
  { t: arrival(PACKETS[7]), text: 'BULB OFF' },
  { t: arrival(PACKETS[8]), text: 'BULB OFF' },
];

/** The bulb's own state: a write switches it when it lands; switch_off at the bulb at once. */
function bulbOn(t: number): boolean {
  if (t >= arrival(PACKETS[7])) return false;
  if (t >= arrival(PACKETS[3])) return true;
  if (t >= LOCAL_OFF) return false;
  return t >= arrival(PACKETS[0]);
}

const FONT = 29;
const SERIAL = { x: -262, y: 46, w: 237, h: 162 };
// The BLE air (B1) at cell (180, -104), 88 x 70; the bulb sits across a lane right of it.
const LANE = { x0: 268, x1: 432, y: -69 };
const BULB = { x: 440, y: -102, w: 60, h: 88 };
const GLASS = { x: BULB.x + 30, y: BULB.y + 30 };
const TAG = { x: 236, y: -152 };
const LABEL = { x: BULB.x + 4, y: BULB.y - 40 };

const bulbHtml = `
  <svg data-bulb style="position:absolute;left:${BULB.x}px;top:${BULB.y}px;overflow:visible" width="${BULB.w}" height="${BULB.h}" viewBox="0 0 60 88">
    <path data-bulb-glass d="M 30 2 A 28 28 0 0 1 48 51 L 44 60 H 16 L 12 51 A 28 28 0 0 1 30 2 Z" stroke-width="1.6" />
    <rect x="16" y="60" width="28" height="18" rx="3" fill="${METAL}" stroke="${METAL_EDGE}" stroke-width="1.4" />
    <path d="M 16 66 H 44 M 16 72 H 44" stroke="${METAL_EDGE}" stroke-width="1.4" />
    <path d="M 22 78 H 38 L 34 86 H 26 Z" fill="${METAL_EDGE}" />
  </svg>`;

const chip = (p: Packet, t: number) => {
  const age = t - p.t;
  if (age < 0 || age >= GONE) return '';
  const k = easeInOutCubic(clamp(age / FLIGHT));
  const cw = Math.ceil(p.text.length * 0.6 * FONT + 12);
  const ch = Math.round(1.3 * FONT);
  const from = LANE.x0 + cw / 2 + 4;
  const to = LANE.x1 - cw / 2 - 4;
  const cx = p.dir === 'to' ? from + (to - from) * k : to - (to - from) * k;
  const opacity = Math.min(clamp(age / 100), 1 - clamp((age - FLIGHT - LINGER) / 100));
  const look = p.dir === 'to' ? `background:${PHONE_RULE};color:${TEXT}` : `background:${BLUE};color:${FACE}`;
  return `<div style="position:absolute;left:${cx - cw / 2}px;top:${LANE.y - ch / 2}px;width:${cw}px;height:${ch}px;border-radius:${ch / 2}px;${look};opacity:${opacity};text-align:center;white-space:nowrap;font:600 ${FONT}px/${ch}px var(--mono)">${p.text}</div>`;
};

const bleRemoteSwitchNrf52840: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('out', SERIAL, { note: '115200', cableTo: USB.nrf52840, fontSize: FONT })}
      ${glow('bulb', { tone: 'lamp', scale: 1.5 })}
      <div data-c-brsn-lane style="position:absolute;left:${LANE.x0}px;top:${LANE.y - 1}px;width:${LANE.x1 - LANE.x0}px;border-top:2px dashed ${MUTED}"></div>
      <div data-c-brsn-link style="position:absolute;left:${LANE.x0}px;width:${LANE.x1 - LANE.x0}px;top:${LANE.y + 22}px;text-align:center;white-space:nowrap;font:600 ${FONT}px/1 var(--sans)"></div>
      <div data-c-brsn-chips style="position:absolute;left:0;top:0"></div>
      ${bulbHtml}
      <div style="position:absolute;left:${LABEL.x}px;top:${LABEL.y}px;white-space:nowrap;font:700 ${FONT}px/1 var(--sans);color:${TEXT}">BLE-Bulb</div>
      <div data-c-brsn-tag style="position:absolute;left:${TAG.x}px;top:${TAG.y}px;padding:2px 8px;border-radius:8px;background:${PHONE_RULE};white-space:nowrap;font:600 ${FONT}px/1.2 var(--sans);color:${TEXT}">switched off</div>
      ${finger('f', { length: 60 })}`,
    bounds: [SERIAL.x, TAG.y, LABEL.x + 140, 250],
  },
  run(t, view) {
    const btn = view.box(BUTTON);
    const pressing = pressFinger(view, 'f', t, { x: btn.x + btn.w / 2, y: btn.y + btn.h / 2 + 4 }, PRESSES);
    view.part<Button>(BUTTON).pressed = pressing;
    for (const id of SIGNAL_WIRES) view.glowWire(id, pressing ? 1 : 0);

    const on = bulbOn(t);
    const glass = view.q<SVGPathElement>('[data-bulb-glass]');
    glass.setAttribute('fill', on ? GOLD : FACE);
    glass.setAttribute('stroke', on ? SUN_EDGE : MUTED);
    setGlow(view, 'bulb', GLASS, on ? 1 : 0);

    const linked = t < DROP || t >= RECONNECT;
    view.q<HTMLElement>('[data-c-brsn-lane]').style.borderColor = linked ? GREEN : MUTED;
    const link = view.q<HTMLElement>('[data-c-brsn-link]');
    link.textContent = linked ? 'connected' : 'scanning…';
    link.style.color = linked ? GREEN : MUTED;
    view.q<HTMLElement>('[data-c-brsn-chips]').innerHTML = PACKETS.map((p) => chip(p, t)).join('');

    const tag = t - LOCAL_OFF;
    view.q<HTMLElement>('[data-c-brsn-tag]').style.opacity = String(Math.min(clamp(tag / 150), 1 - clamp((tag - 1000) / 150)));

    showSerial(view, 'out', t, PRINTS, { fadeFrom: FADE_FROM });
  },
};

export default bleRemoteSwitchNrf52840;

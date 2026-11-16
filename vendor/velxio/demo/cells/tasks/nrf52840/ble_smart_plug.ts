import { clamp } from '../../anim';
import type { Cell, CellView, ExtraPart } from '../../cell';
import { batteryPart } from '../../decor/battery';
import { MUTED } from '../../decor/common';
import { finger, pressFinger } from '../../decor/finger';
import { glow, setGlow } from '../../decor/glow';
import { phone, phoneHeight, phoneWidth, runPhone, setPhoneLink, type PhoneLink, type PhoneMessage } from '../../decor/phone';

// Board-specific names.
const BUTTON = 'BTN';
const RELAY = 'RLY1';
const BUTTON_WIRES = ['w-P1.11-BTN', 'w-P1.11-RPD'];
const RELAY_WIRE = 'w-P1.15-IN';
const LOAD_WIRES = ['load-no', 'load-ret', 'load-com'];

type Button = HTMLElement & { pressed: boolean };
type Relay = HTMLElement & { energized: boolean };

// The relay's load, which circuit.ts leaves out: a festoon lamp (as in
// clap_switch) and a 12 V pack in series between COM and NO. Pins A and B are
// the ends of its two leads; `--on` (0..1) lights the glass.
export function lampPart(id: string, x: number, y: number): ExtraPart {
  return {
    id,
    x,
    y,
    pins: { A: { x: 0, y: 62 }, B: { x: 72, y: 62 } },
    html: `
      <svg data-lamp="${id}" viewBox="0 0 72 66" width="72" height="66">
        <path d="M 32 54 V 62 H 0 M 40 54 V 62 H 72" fill="none" stroke="#8b95a1" stroke-width="2.6"/>
        <path data-lamp-glass d="M 27 42 C 12 34 10 2 36 2 C 62 2 60 34 45 42 Z" stroke="#a7b0bb" stroke-width="1.4"/>
        <path d="M 31 42 V 24 M 41 42 V 24 M 31 24 l 2 -3 l 2 3 l 2 -3 l 2 3 l 2 -3" fill="none" stroke="#7c5a2a" stroke-width="1.4"/>
        <rect x="27" y="41" width="18" height="14" rx="2" fill="#c3c9d1" stroke="#8b95a1"/>
        <path d="M 27 45.5 H 45 M 27 50 H 45" stroke="#8b95a1" stroke-width="1.2"/>
      </svg>`,
  };
}

/** Lights lamp `id` by `on` (0..1), its glow centred on the glass. */
export function setLamp(view: CellView, id: string, glowKey: string, at: { x: number; y: number }, on: number) {
  view.q<SVGPathElement>(`[data-lamp="${id}"] [data-lamp-glass]`).setAttribute('fill', `color-mix(in srgb, #ffd65a ${Math.round(100 * clamp(on))}%, #eef2f6)`);
  setGlow(view, glowKey, { x: at.x + 36, y: at.y + 20 }, on);
}

/** 0..1 for a relay switching at the `switches` times (first one on), easing over 120 ms. */
export function lampLevel(t: number, switches: number[]): number {
  const past = switches.filter((s) => s <= t);
  const on = past.length % 2 === 1;
  const since = past.length ? t - past[past.length - 1] : Infinity;
  const k = clamp(since / 120);
  return on ? k : 1 - k;
}

// The phone is the central: it connects to BLE-Plug, reads the relay state and
// subscribes. It writes 1 (relay on, notified), then 2 (rejected with ATT
// error 0x13, Value Not Allowed, relay unchanged). The button toggles the
// relay off (notified). The phone hangs up; the board advertises again and a
// press while nobody is connected switches the relay on. The phone reconnects,
// reads 1, and writes 0 (off, notified). The button is polled every 10 ms.
const DURATION = 6000;
const PRESSES: [number, number][] = [
  [2200, 2450],
  [3400, 3650],
];
const WRITE_ON = 300;
const WRITE_BAD = 1300;
const HANG_UP = 2950;
const SCAN = 3900;
const RECONNECT = 4300;
const READ = 4500;
const WRITE_OFF = 5100;
const FADE_FROM = 5700;
const LANDS = 30;
const REPLY = 200;
// The relay switches when a write lands or a press is seen.
const SWITCHES = [WRITE_ON + LANDS, PRESSES[0][0] + 10, PRESSES[1][0] + 10, WRITE_OFF + LANDS];

const CHAT: PhoneMessage[] = [
  { t: WRITE_ON, text: 'write 1', from: 'out' },
  { t: WRITE_ON + REPLY, text: 'notify 1', from: 'in' },
  { t: WRITE_BAD, text: 'write 2', from: 'out' },
  { t: WRITE_BAD + REPLY, text: 'not allowed', from: 'in' },
  { t: SWITCHES[1] + 140, text: 'notify 0', from: 'in' },
  { t: READ, text: 'read', from: 'out' },
  { t: READ + REPLY, text: '1', from: 'in' },
  { t: WRITE_OFF, text: 'write 0', from: 'out' },
  { t: WRITE_OFF + REPLY, text: 'notify 0', from: 'in' },
];

function link(t: number): PhoneLink {
  if (t < HANG_UP) return 'connected';
  if (t < SCAN) return 'idle';
  if (t < RECONNECT) return 'scanning';
  return 'connected';
}

const F = 29;
// Cell coordinates: the relay spans x -140..-52, y -46..2, NO/COM on its left edge at y -32/-22.
const LAMP = { x: -240, y: -84 };
const BATTERY = { x: -246, y: -124 };
const PHONE_PARTS = { fontSize: F, status: true };
const PHONE_W = phoneWidth(11, F);
const PHONE_H = phoneHeight({ ...PHONE_PARTS, rows: 2 });
// Right of B1 (cell 196..284, -104..-34).
const ADV = { x: 296, y: -84 };
const PHONE = { x: -40 - PHONE_W, y: 20, w: PHONE_W, h: PHONE_H };

const bleSmartPlugNrf52840: Cell = {
  duration: DURATION,
  extras: {
    parts: [lampPart('LAMP', LAMP.x, LAMP.y), batteryPart('BAT', BATTERY.x, BATTERY.y)],
    wires: [
      { id: 'load-no', from: [RELAY, 'NO'], to: ['BAT', 'pos'], color: '#ff0000', via: [{ x: -152, y: -32 }, { x: -152, y: -110 }] },
      { id: 'load-ret', from: ['BAT', 'neg'], to: ['LAMP', 'A'], color: '#000000', via: [{ x: -256, y: -110 }, { x: -256, y: -22 }] },
      { id: 'load-com', from: [RELAY, 'COM'], to: ['LAMP', 'B'], color: '#aa00ff' },
    ],
  },
  decor: {
    html: `
      ${glow('lamp', { tone: 'lamp', scale: 1.7 })}
      ${phone('phone', { ...PHONE, ...PHONE_PARTS, title: 'BLE-Plug', maxRows: 2 })}
      <div data-c-bspn-adv style="position:absolute;left:${ADV.x}px;top:${ADV.y}px;white-space:nowrap;font:600 ${F}px/1 var(--sans);color:${MUTED}">advertising</div>
      ${finger('f', { length: 48, rotate: 270 })}`,
    bounds: [PHONE.x, BATTERY.y, PHONE.x + PHONE.w, PHONE.y + PHONE.h],
  },
  run(t, view) {
    const btn = view.box(BUTTON);
    const pressing = pressFinger(view, 'f', t, { x: btn.x + btn.w / 2, y: btn.y + btn.h / 2 }, PRESSES, { lift: 14 });
    // The finger shows only around its presses.
    const near = Math.max(...PRESSES.map(([down, up]) => Math.min(clamp((t - down + 300) / 150), 1 - clamp((t - up - 150) / 150))));
    view.q<HTMLElement>('[data-finger="f"]').style.opacity = String(near);
    view.part<Button>(BUTTON).pressed = pressing;
    for (const id of BUTTON_WIRES) view.glowWire(id, pressing ? 1 : 0);

    const level = lampLevel(t, SWITCHES);
    const on = SWITCHES.filter((s) => s <= t).length % 2 === 1;
    view.part<Relay>(RELAY).energized = on;
    view.glowWire(RELAY_WIRE, on ? 1 : 0);
    for (const id of LOAD_WIRES) view.glowWire(id, 0.6 * level);
    setLamp(view, 'LAMP', 'lamp', LAMP, level);

    setPhoneLink(view, 'phone', link(t));
    // Advertising restarts once the link is down and stops when the phone connects.
    view.q<HTMLElement>('[data-c-bspn-adv]').style.opacity = String(Math.min(clamp((t - HANG_UP - 50) / 150), 1 - clamp((t - RECONNECT) / 150)));
    runPhone(view, 'phone', t, CHAT, FADE_FROM);
  },
};

export default bleSmartPlugNrf52840;

import { clamp } from '../../anim';
import type { Cell } from '../../cell';
import { batteryPart } from '../../decor/battery';
import { MUTED } from '../../decor/common';
import { finger, pressFinger } from '../../decor/finger';
import { glow } from '../../decor/glow';
import { phone, phoneHeight, phoneWidth, runPhone, setPhoneLink, type PhoneLink, type PhoneMessage } from '../../decor/phone';
import { lampLevel, lampPart, setLamp } from './ble_smart_plug';

// Board-specific names.
const BUTTON = 'BTN';
const RELAY = 'RLY1';
const BUTTON_WIRES = ['w-P1.11-BTN', 'w-P1.11-RPD'];
const RELAY_WIRE = 'w-P1.15-IN';
const LOAD_WIRES = ['load-no', 'load-ret', 'load-com'];

type Button = HTMLElement & { pressed: boolean };
type Relay = HTMLElement & { energized: boolean };

// Two phones, A and B, are connected to BLE-Shared and subscribed, so the
// board does not advertise. A writes 1 and B writes 0; each change is notified
// to both, and so is the button's toggle. A hangs up: with one link left the
// board advertises; B writes 0 and only B is notified. A scans, reconnects
// (advertising stops), subscribes and reads 0. The button is polled every 10 ms.
const DURATION = 6000;
const PRESSES: [number, number][] = [[2300, 2550]];
const A_WRITE_ON = 300;
const B_WRITE_OFF = 1300;
const A_HANG_UP = 3200;
const B_WRITE_OFF_ALONE = 3500;
const A_SCAN = 4300;
const A_RECONNECT = 4700;
const A_READ = 4900;
const FADE_FROM = 5700;
const LANDS = 30;
const REPLY = 200;
const SWITCHES = [A_WRITE_ON + LANDS, B_WRITE_OFF + LANDS, PRESSES[0][0] + 10, B_WRITE_OFF_ALONE + LANDS];
const BUTTON_NOTIFY = SWITCHES[2] + 140;

const CHAT_A: PhoneMessage[] = [
  { t: A_WRITE_ON, text: 'write 1', from: 'out' },
  { t: A_WRITE_ON + REPLY, text: 'notify 1', from: 'in' },
  { t: B_WRITE_OFF + REPLY, text: 'notify 0', from: 'in' },
  { t: BUTTON_NOTIFY, text: 'notify 1', from: 'in' },
  { t: A_READ, text: 'read', from: 'out' },
  { t: A_READ + REPLY, text: '0', from: 'in' },
];
const CHAT_B: PhoneMessage[] = [
  { t: A_WRITE_ON + REPLY, text: 'notify 1', from: 'in' },
  { t: B_WRITE_OFF, text: 'write 0', from: 'out' },
  { t: B_WRITE_OFF + REPLY, text: 'notify 0', from: 'in' },
  { t: BUTTON_NOTIFY, text: 'notify 1', from: 'in' },
  { t: B_WRITE_OFF_ALONE, text: 'write 0', from: 'out' },
  { t: B_WRITE_OFF_ALONE + REPLY, text: 'notify 0', from: 'in' },
];

function linkA(t: number): PhoneLink {
  if (t < A_HANG_UP) return 'connected';
  if (t < A_SCAN) return 'idle';
  if (t < A_RECONNECT) return 'scanning';
  return 'connected';
}

const F = 29;
// Cell coordinates: the relay spans x -140..-52, y -46..2, NO/COM on its left edge at y -32/-22.
const LAMP = { x: -240, y: -84 };
const BATTERY = { x: -246, y: -124 };
const PHONE_PARTS = { fontSize: F, status: true };
const PHONE_W = phoneWidth(11, F);
const PHONE_H = phoneHeight({ ...PHONE_PARTS, rows: 2 });
const PHONE_B = { x: -40 - PHONE_W, y: 20, w: PHONE_W, h: PHONE_H };
const PHONE_A = { ...PHONE_B, x: PHONE_B.x - 16 - PHONE_W };
// Under B1 (cell 196..284, -124..-54), above the board's top edge.
const ADV = { x: 196, y: -44 };

const bleSharedPlugNrf52840: Cell = {
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
      ${phone('a', { ...PHONE_A, ...PHONE_PARTS, title: 'Phone A', maxRows: 2 })}
      ${phone('b', { ...PHONE_B, ...PHONE_PARTS, title: 'Phone B', maxRows: 2 })}
      <div data-c-bshn-adv style="position:absolute;left:${ADV.x}px;top:${ADV.y}px;white-space:nowrap;font:600 ${F}px/1 var(--sans);color:${MUTED}">advertising</div>
      ${finger('f', { length: 48, rotate: 270 })}`,
    // "advertising" is about 0.55 em a character.
    bounds: [PHONE_A.x, BATTERY.y, ADV.x + Math.ceil(11 * 0.55 * F), PHONE_B.y + PHONE_B.h],
  },
  run(t, view) {
    const btn = view.box(BUTTON);
    const pressing = pressFinger(view, 'f', t, { x: btn.x + btn.w / 2, y: btn.y + btn.h / 2 }, PRESSES, { lift: 14 });
    // The finger shows only around its press.
    const [down, up] = PRESSES[0];
    view.q<HTMLElement>('[data-finger="f"]').style.opacity = String(Math.min(clamp((t - down + 300) / 150), 1 - clamp((t - up - 150) / 150)));
    view.part<Button>(BUTTON).pressed = pressing;
    for (const id of BUTTON_WIRES) view.glowWire(id, pressing ? 1 : 0);

    const level = lampLevel(t, SWITCHES);
    const on = SWITCHES.filter((s) => s <= t).length % 2 === 1;
    view.part<Relay>(RELAY).energized = on;
    view.glowWire(RELAY_WIRE, on ? 1 : 0);
    for (const id of LOAD_WIRES) view.glowWire(id, 0.6 * level);
    setLamp(view, 'LAMP', 'lamp', LAMP, level);

    setPhoneLink(view, 'a', linkA(t));
    setPhoneLink(view, 'b', true);
    runPhone(view, 'a', t, CHAT_A, FADE_FROM);
    runPhone(view, 'b', t, CHAT_B, FADE_FROM);
    // With fewer than two links the board advertises; A's reconnection stops it.
    view.q<HTMLElement>('[data-c-bshn-adv]').style.opacity = String(Math.min(clamp((t - A_HANG_UP - 50) / 150), 1 - clamp((t - A_RECONNECT) / 150)));
  },
};

export default bleSharedPlugNrf52840;

import { clamp } from '../../anim';
import type { Cell } from '../../cell';
import { finger, pressFinger, tapFinger } from '../../decor/finger';
import { phone, phoneButtonAt, phoneHeight, phoneWidth, setPhoneButton, setPhoneLink, setPhoneReadout, type PhoneLink } from '../../decor/phone';
import { setSound, sound } from '../../decor/sound';
import { PHONE_RULE, TEXT } from '../../decor/common';
import { FLIGHT, airLane, runAir, type Packet } from './ble_uart_console';

// | board   | nrf52840-dk                         |
// | button  | BTN: w-P1.11-BTN, w-P1.11-RPD        |
// | buzzer  | BZ1: w-P1.15-BZ1                     |
// | radio   | B1                                   |
const BUTTON_WIRES = ['w-P1.11-BTN', 'w-P1.11-RPD'];
const BUZZER_WIRE = 'w-P1.15-BZ1';

type Buzzer = HTMLElement & { hasSignal: boolean };
type Button = HTMLElement & { pressed: boolean };

// A key finder app is connected to BLE-Finder and has written High to Link
// Loss. It writes Immediate Alert levels: Mild beeps the passive buzzer half a
// second on, half off; None silences it; High sounds it continuously until the
// board's button silences it. Then the phone vanishes (its radio resets, so the
// board sees the link time out, not a disconnect) and the board sounds the
// Link Loss level, High, while it advertises; the phone reconnects, which
// silences it, and writes its Link Loss level again.
const DURATION = 6000;
const WRITES = [
  { tap: 450, level: 1, button: 0 },
  { tap: 1600, level: 0, button: 2 },
  { tap: 2200, level: 2, button: 1 },
].map((w) => ({ ...w, sent: w.tap + 100, lands: w.tap + 100 + FLIGHT }));
const PRESS: [number, number] = [3200, 3500];
const VANISH = 3700;
// The link's supervision timeout: Bumble connects with 720 ms.
const TIMEOUT = VANISH + 720;
const SCAN_FROM = 4600;
const CONNECT = 5050;
const LINK_LOSS_WRITE = 5100;
const FADE_FROM = 5700;

/** The alert sounding at t: its level and when it started, or null. */
function alertAt(t: number): { level: number; from: number } | null {
  if (t >= TIMEOUT && t < CONNECT) return { level: 2, from: TIMEOUT };
  const last = WRITES.findLast((w) => w.lands <= t);
  if (!last || last.level === 0) return null;
  // The button is polled every 10 ms.
  if (last.level === 2 && t >= PRESS[0] + 10) return null;
  return { level: last.level, from: last.lands };
}
const sounding = (a: { level: number; from: number } | null, t: number) =>
  a !== null && (a.level === 2 || Math.floor((t - a.from) / 500) % 2 === 0);

function link(t: number): [PhoneLink, string] {
  if (t < VANISH || t >= CONNECT) return ['connected', 'Connected'];
  if (t < SCAN_FROM) return ['idle', 'Link lost'];
  return ['scanning', 'Scanning…'];
}

// Advertising events while no phone is connected, every 250 ms; the Link Loss write and its read-back.
const PACKETS: Packet[] = [
  ...WRITES.map((w): Packet => ({ t: w.sent, dir: 'up' })),
  ...[TIMEOUT, TIMEOUT + 250].map((t): Packet => ({ t, dir: 'down', adv: true })),
  { t: LINK_LOSS_WRITE, dir: 'up' },
  { t: LINK_LOSS_WRITE + FLIGHT, dir: 'down' },
];

const TAGS: { from: number; to: number; text: string }[] = [
  { from: WRITES[0].lands, to: WRITES[1].lands, text: 'Mild: ½ s on, ½ s off' },
  { from: WRITES[1].lands, to: WRITES[2].lands, text: 'No Alert' },
  { from: WRITES[2].lands, to: PRESS[0] + 10, text: 'High: continuous' },
  { from: PRESS[0] + 10, to: VANISH, text: 'button: silenced' },
  { from: VANISH, to: TIMEOUT, text: 'phone gone…' },
  { from: TIMEOUT, to: CONNECT, text: 'link lost: High' },
  { from: CONNECT, to: FADE_FROM, text: 'reconnected: silent' },
];

// Cell coordinates: B1 (box -184, 86, 88 x 70) left of the board; the phone left of it.
const FONT = 40;
const BUTTONS = ['Mild', 'High', 'None'];
const B1 = { x: -184, y: 86, w: 88, h: 70 };
const PHONE_W = phoneWidth(9, FONT);
const PARTS = { fontSize: FONT, status: true, readout: 'Link Loss', buttons: BUTTONS, buttonsLabel: 'Alert now' };
const PHONE_H = phoneHeight({ ...PARTS, rows: 0 });
const PHONE = { ...PARTS, x: B1.x - 50 - PHONE_W, y: Math.round(B1.y + B1.h / 2 - PHONE_H / 2), w: PHONE_W, h: PHONE_H };
const TAPS = WRITES.map((w) => ({ at: phoneButtonAt(PHONE, w.button), down: w.tap, up: w.tap + 200 }));
const TAG = { x: 30, y: -90 };

const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${phone('phone', { ...PHONE, title: 'BLE-Finder', maxRows: 0 })}
      ${airLane('air', { x0: PHONE.x + PHONE.w, x1: B1.x, y: B1.y + B1.h / 2 })}
      ${sound('buz')}
      <div data-c-bkfn-tag style="position:absolute;left:${TAG.x}px;top:${TAG.y}px;padding:2px 8px;border-radius:8px;background:${PHONE_RULE};white-space:nowrap;font:600 ${FONT}px/1.2 var(--sans);color:${TEXT}"></div>
      ${finger('f', { rotate: 180, length: 64 })}
      ${finger('pf', { rotate: 135, length: 64 })}`,
    bounds: [PHONE.x, Math.min(TAG.y, PHONE.y), B1.x + B1.w, PHONE.y + PHONE.h + 40],
  },
  run(t, view) {
    const [state, text] = link(t);
    setPhoneLink(view, 'phone', state, text);
    const tapping = tapFinger(view, 'pf', t, TAPS, DURATION);
    WRITES.forEach((w, i) => setPhoneButton(view, 'phone', tapping === i ? 1 : 0, w.button));
    // The phone's finger shows from 300 ms before the first tap until 300 ms after the last.
    view.q<HTMLElement>('[data-finger="pf"]').style.opacity = String(Math.min(clamp((t - TAPS[0].down + 300) / 150), clamp((TAPS[TAPS.length - 1].up + 300 - t) / 150)));
    const written = t >= LINK_LOSS_WRITE + 2 * FLIGHT ? t - LINK_LOSS_WRITE - 2 * FLIGHT : Infinity;
    setPhoneReadout(view, 'phone', 'High', clamp(1 - written / 400));
    runAir(view, 'air', t, PACKETS);

    const btn = view.box('BTN');
    const pressing = pressFinger(view, 'f', t, { x: btn.x + btn.w / 2, y: btn.y + btn.h / 2 }, [PRESS]);
    view.q<HTMLElement>('[data-finger="f"]').style.opacity = String(Math.min(clamp((t - PRESS[0] + 300) / 150), clamp((PRESS[1] + 300 - t) / 150)));
    view.part<Button>('BTN').pressed = pressing;
    for (const id of BUTTON_WIRES) view.glowWire(id, pressing ? 1 : 0);

    const alert = alertAt(t);
    const on = sounding(alert, t);
    view.part<Buzzer>('BZ1').hasSignal = on;
    view.glowWire(BUZZER_WIRE, on ? 1 : 0);
    const buz = view.box('BZ1');
    // One ring every 200 ms while it sounds, counted from the start of each on-phase.
    const phaseStart = alert === null ? 0 : alert.level === 2 ? alert.from : alert.from + 1000 * Math.floor((t - alert.from) / 1000);
    setSound(view, 'buz', { x: buz.x + 38, y: buz.y + buz.h / 2 }, on ? (t - phaseStart) / 200 : null, { from: 50, to: 90 });

    const tag = TAGS.find((g) => t >= g.from && t < g.to);
    const el = view.q<HTMLElement>('[data-c-bkfn-tag]');
    el.textContent = tag?.text ?? '';
    el.style.opacity = String(tag ? Math.min(clamp((t - tag.from) / 150), clamp((tag.to - t) / 150)) : 0);
  },
};

export default cell;

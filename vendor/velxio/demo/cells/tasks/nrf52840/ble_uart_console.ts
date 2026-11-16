import { clamp, easeInOutCubic } from '../../anim';
import type { Cell, CellView } from '../../cell';
import { BLUE, MUTED, SCANNING } from '../../decor/common';
import { phone, phoneHeight, phoneWidth, runPhone, setPhoneButton, setPhoneLink, type PhoneLink, type PhoneMessage } from '../../decor/phone';

// The phone's UART terminal app connects to BLE-Console and taps its command
// buttons. Each command is one write to the Nordic UART RX characteristic; the
// board answers each with one TX notification: "TEMP?" reads the TMP36
// ("TEMP 22.5", the test's first temperature), "LED ON"/"LED OFF" switch the
// LED and answer "OK", and anything else ("HELLO") gets "ERR". Then the phone
// hangs up and the board advertises again, which is how the loop starts.

const LED_WIRES = ['w-P1.15-R1', 'w-R1-L1'];
const VOUT_WIRE = 'w-P0.03-Vout';
// TMP36 at 22.5 °C: 500 mV + 10 mV/°C, on a 3.3 V supply.
const VOUT_LEVEL = 0.725 / 3.3;

const DURATION = 6000;
const CONNECT_AT = 500;
const HANG_UP_AT = 5100;
const SCAN_AGAIN_AT = 5400;
const FADE_FROM = 5400;

/** A packet's flight between the phone and the board's radio, ms. */
export const FLIGHT = 250;
// The firmware replies within the same write callback; the reply leaves as the command lands.
const commands = [
  { press: 900, button: 2, text: 'TEMP?', reply: 'TEMP 22.5' },
  { press: 1900, button: 0, text: 'LED ON', reply: 'OK' },
  { press: 2900, button: 3, text: 'HELLO', reply: 'ERR' },
  { press: 3900, button: 1, text: 'LED OFF', reply: 'OK' },
].map((c) => ({ ...c, sent: c.press + 100, lands: c.press + 100 + FLIGHT, answered: c.press + 100 + 2 * FLIGHT }));
const LED_ON_AT = commands[1].lands;
const LED_OFF_AT = commands[3].lands;

const MESSAGES: PhoneMessage[] = commands.flatMap((c) => [
  { t: c.sent, text: c.text, from: 'out' as const },
  { t: c.answered, text: c.reply, from: 'in' as const },
]);

/** A BLE packet: `up` from the phone to the board, `down` back; `adv` is an advertisement. */
export type Packet = { t: number; dir: 'up' | 'down'; adv?: boolean };
// Advertising events while no phone is connected, drawn every 250 ms.
const ADVERTS: Packet[] = [0, 250, SCAN_AGAIN_AT, SCAN_AGAIN_AT + 250].map((t) => ({ t, dir: 'down', adv: true }));
const PACKETS: Packet[] = [...ADVERTS, ...commands.flatMap((c): Packet[] => [{ t: c.sent, dir: 'up' }, { t: c.lands, dir: 'down' }])];

// Cell coordinates. The board's radio (B1) sits left of the board; the phone left of it.
// Pressed buttons shrink by 6 %, and the card's scale is 0.66.
const FONT = 30;
const BUTTONS = ['LED ON', 'LED OFF', 'TEMP?', 'HELLO'];
const B1 = { x: -126, y: 80, w: 88, h: 70 };
const PHONE_W = phoneWidth(16, FONT);
const PHONE_H = phoneHeight({ fontSize: FONT, status: true, buttons: BUTTONS, rows: 3 });
const PHONE = { x: B1.x - 60 - PHONE_W, y: Math.round(B1.y + B1.h / 2 - PHONE_H / 2), w: PHONE_W, h: PHONE_H };
const LANE = { x0: PHONE.x + PHONE.w, x1: B1.x, y: B1.y + B1.h / 2 };

/** A dashed radio lane from x0 to x1 at height y, with the packets that cross it. */
export function airLane(key: string, lane: { x0: number; x1: number; y: number }): string {
  return `
    <div style="position:absolute;left:${lane.x0}px;top:${lane.y - 1}px;width:${lane.x1 - lane.x0}px;border-top:2px dashed ${MUTED}"></div>
    <div data-air="${key}" data-x0="${lane.x0}" data-x1="${lane.x1}" style="position:absolute;left:0;top:${lane.y - 6}px"></div>`;
}

/** Draws the packets in flight on lane `key` at `t`: each leaves its end at its `t` and takes FLIGHT ms. */
export function runAir(view: CellView, key: string, t: number, packets: Packet[]) {
  const el = view.q<HTMLElement>(`[data-air="${key}"]`);
  const x0 = Number(el.dataset.x0) + 6;
  const x1 = Number(el.dataset.x1) - 18;
  el.innerHTML = packets
    .filter((p) => t >= p.t && t < p.t + FLIGHT)
    .map((p) => {
      const k = easeInOutCubic(clamp((t - p.t) / FLIGHT));
      const x = p.dir === 'up' ? x0 + k * (x1 - x0) : x1 - k * (x1 - x0);
      return `<div style="position:absolute;left:${x}px;top:0;width:12px;height:12px;border-radius:50%;background:${p.adv ? SCANNING : BLUE}"></div>`;
    })
    .join('');
}

function link(t: number): [PhoneLink, string | undefined] {
  if (t < CONNECT_AT || t >= SCAN_AGAIN_AT) return ['scanning', undefined];
  if (t < HANG_UP_AT) return ['connected', undefined];
  return ['idle', 'Disconnected'];
}

const bleUartConsole: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${phone('phone', { ...PHONE, fontSize: FONT, title: 'BLE-Console', status: true, maxRows: 3, buttons: BUTTONS })}
      ${airLane('air', LANE)}`,
    bounds: [PHONE.x, PHONE.y, B1.x + B1.w, PHONE.y + PHONE.h],
  },
  run(t, view) {
    const [state, text] = link(t);
    setPhoneLink(view, 'phone', state, text);
    commands.forEach((c) => setPhoneButton(view, 'phone', t >= c.press && t < c.press + 200 ? 1 : 0, c.button));
    runPhone(view, 'phone', t, MESSAGES, FADE_FROM);
    runAir(view, 'air', t, PACKETS);

    const ledOn = t >= LED_ON_AT && t < LED_OFF_AT;
    view.part<HTMLElement & { value: boolean }>('L1').value = ledOn;
    if (ledOn) for (const id of LED_WIRES) view.glowWire(id, 1);
    view.glowWire(VOUT_WIRE, VOUT_LEVEL);
  },
};

export default bleUartConsole;

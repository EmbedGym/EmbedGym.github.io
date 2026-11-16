import { clamp } from '../../anim';
import type { Cell, CellView } from '../../cell';
import { phone, phoneWidth, runPhone, setPhoneLink, type PhoneMessage } from '../../decor/phone';
import { USB, serialPanel, showSerial, type Print } from '../../kit';

// Shared by the HM-10 cells: the serial monitor left of the board, and under
// it a phone running a BLE chat app. The module's status LED blinks until the
// phone connects.

type Rect = { x: number; y: number; w: number; h: number };

const COLUMN_X = -236;
const MONITOR_W = 212;

/**
 * The serial monitor and the phone for a cell whose text is `fontSize` px.
 * The monitor holds `monitorRows` rows and straddles the board's USB port,
 * as high as `top` allows; the phone, wide enough for a `phoneChars`-character
 * message, fills the rest of the column down to `bottom`.
 */
export function hm10Decor(o: { fontSize: number; monitorRows: number; phoneChars: number; top: number; bottom: number }) {
  const f = o.fontSize;
  const sh = Math.ceil(34 + o.monitorRows * 1.36 * f + 10);
  const serial: Rect = { x: COLUMN_X, y: Math.max(o.top, Math.round(USB.mega.y + 20 - sh)), w: MONITOR_W, h: sh };
  const pw = phoneWidth(o.phoneChars, f);
  const py = serial.y + serial.h + 16;
  const phoneRect: Rect = { x: Math.round(COLUMN_X + (MONITOR_W - pw) / 2), y: py, w: pw, h: o.bottom - py };
  return {
    html: `${serialPanel('out', serial, { note: '9600', cableTo: USB.mega, fontSize: f })}${phone('phone', { ...phoneRect, fontSize: f, title: 'HM-10' })}`,
    bounds: [serial.x, serial.y, serial.x + serial.w, phoneRect.y + phoneRect.h] as [number, number, number, number],
  };
}

/** The module's link state and the phone's status dot at time `t`. */
export function runHm10Link(view: CellView, t: number, connectAt: number, dropAt: number) {
  const connected = t >= connectAt && t < dropAt;
  // A real HM-10 blinks its status LED while advertising and holds it on once connected.
  const led = connected || (t % 1000) < 500;
  view.part<HTMLElement & { showStatus(high: boolean): void }>('BLE1').showStatus(led);
  setPhoneLink(view, 'phone', connected);
}

/** The vertical extent of the HM-10 circuit, in cell coordinates: the top header's wires to the wires under the module. */
export const HM10_TOP = -18;
export const HM10_BOTTOM = 305;

/** Glows a UART wire for a burst of `bytes` starting at `at`, at least long enough to see. */
export function glowBurst(view: CellView, ids: string[], t: number, at: number, bytes: number) {
  const ms = Math.max(220, bytes * (10 / 9.6));
  if (t >= at && t < at + ms) for (const id of ids) view.glowWire(id, 1);
}

// The sketch sends "AT" at power-on and waits up to 2 s for "OK"; the module
// answers at once, so "HM-10 Ready" prints a moment later. Then it relays
// whatever the module receives: a phone connects and sends "hello".
export const DURATION = 6000;
const FONT = 25;
export const AT_AT = 300;
// The module answers within milliseconds; the reply is drawn after the AT glow so the order reads.
export const OK_AT = 600;
// The tags fade before the phone connects, leaving the relay its own phase.
export const TAGS_TO = 1500;
export const CONNECT_AT = 1800;
export const HELLO_AT = 3000;
export const FADE_FROM = 5500;
const TO_MODULE = ['w-18-HV1', 'w-LV1-RXD'];
const FROM_MODULE = ['w-TXD-19'];

export const PRINTS: Print[] = [
  { t: OK_AT + 30, text: 'HM-10 Ready' },
  { t: HELLO_AT + 8, text: 'hello' },
];
export const PHONE_LINES: PhoneMessage[] = [{ t: HELLO_AT, text: 'hello', from: 'out' }];
// The AT/OK exchange is labelled under the board, left of the level shifter's power wires.
const TAG = { x: 50, y: 206 };

const DECOR = hm10Decor({ fontSize: FONT, monitorRows: 2, phoneChars: 5, top: HM10_TOP, bottom: HM10_BOTTOM });

const hm10AtReadyCheck: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-hm-tag {
          position: absolute; left: ${TAG.x}px; padding: 0 8px; border-radius: 8px; background: #fff;
          font: 700 ${FONT}px/1.36 var(--mono); border: 2px solid currentColor; opacity: 0;
        }
        .c-hm-at { top: ${TAG.y}px; color: #0066ff; }
        .c-hm-ok { top: ${TAG.y + 52}px; color: #00870a; }
      </style>
      ${DECOR.html}
      <div class="c-hm-tag c-hm-at">AT→</div>
      <div class="c-hm-tag c-hm-ok">OK←</div>`,
    bounds: DECOR.bounds,
  },
  run(t, view) {
    runHm10Link(view, t, CONNECT_AT, FADE_FROM);
    glowBurst(view, TO_MODULE, t, AT_AT, 2);
    glowBurst(view, FROM_MODULE, t, OK_AT, 4);
    glowBurst(view, FROM_MODULE, t, HELLO_AT, 5);
    view.q<HTMLElement>('.c-hm-at').style.opacity = String(clamp((t - AT_AT) / 150) * (1 - clamp((t - TAGS_TO) / 300)));
    view.q<HTMLElement>('.c-hm-ok').style.opacity = String(clamp((t - OK_AT) / 150) * (1 - clamp((t - TAGS_TO) / 300)));
    showSerial(view, 'out', t, PRINTS, { board: 'arduino-mega', fadeFrom: FADE_FROM });
    runPhone(view, 'phone', t, PHONE_LINES, FADE_FROM);
  },
};

export default hm10AtReadyCheck;

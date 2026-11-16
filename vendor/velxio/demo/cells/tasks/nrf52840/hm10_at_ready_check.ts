import { clamp } from '../../anim';
import type { Cell } from '../../cell';
import { phone, phoneWidth, runPhone } from '../../decor/phone';
import { USB, serialPanel, showSerial } from '../../kit';
import { AT_AT, CONNECT_AT, DURATION, FADE_FROM, HELLO_AT, OK_AT, PHONE_LINES, PRINTS, TAGS_TO, glowBurst, runHm10Link } from '../mega/hm10_at_ready_check';

// The module runs on VDD and talks to uart1: P1.02 TX → RXD, TXD → P1.01 RX;
// no level shifter. It sits above the board's top-left, so the serial monitor
// straddles the USB socket under it and the phone stands at the far left.

export const TO_MODULE = ['w-P1.02-RXD'];
export const FROM_MODULE = ['w-P1.01-TXD'];

/** Left of the VDD wire that runs down the board's left side. */
const COLUMN_RIGHT = -32;
const MONITOR_W = 212;
const TOP = -88;
const BOTTOM = 250;

/** The serial monitor under the module and the phone left of it, for `fontSize` px text and a `phoneChars`-character message. */
export function hm10NrfDecor(o: { fontSize: number; phoneChars: number }) {
  const f = o.fontSize;
  const sh = Math.ceil(34 + 2 * 1.36 * f + 10);
  const serial = { x: COLUMN_RIGHT - MONITOR_W, y: Math.round(USB.nrf52840.y + 30 - sh), w: MONITOR_W, h: sh };
  const pw = phoneWidth(o.phoneChars, f);
  const ph = Math.round(2.2 * pw);
  const phoneRect = { x: serial.x - 16 - pw, y: BOTTOM - ph, w: pw, h: ph };
  return {
    html: `${serialPanel('out', serial, { note: '9600', cableTo: USB.nrf52840, fontSize: f })}${phone('phone', { ...phoneRect, fontSize: f, title: 'HM-10' })}`,
    bounds: [phoneRect.x, TOP, COLUMN_RIGHT, BOTTOM] as [number, number, number, number],
  };
}

const FONT = 25;
// The AT/OK exchange is labelled right of the uart wires, above the header.
const TAG = { x: 254, y: -84 };
const DECOR = hm10NrfDecor({ fontSize: FONT, phoneChars: 5 });

const hm10AtReadyCheckNrf: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-hmn-tag {
          position: absolute; left: ${TAG.x}px; padding: 0 8px; border-radius: 8px; background: #fff;
          font: 700 ${FONT}px/1.36 var(--mono); border: 2px solid currentColor; opacity: 0;
        }
        .c-hmn-at { top: ${TAG.y}px; color: #0066ff; }
        .c-hmn-ok { top: ${TAG.y + 46}px; color: #00870a; }
      </style>
      ${DECOR.html}
      <div class="c-hmn-tag c-hmn-at">←AT</div>
      <div class="c-hmn-tag c-hmn-ok">OK→</div>`,
    // The tags are 3 characters wide.
    bounds: [DECOR.bounds[0], DECOR.bounds[1], TAG.x + 66, DECOR.bounds[3]],
  },
  run(t, view) {
    runHm10Link(view, t, CONNECT_AT, FADE_FROM);
    glowBurst(view, TO_MODULE, t, AT_AT, 2);
    glowBurst(view, FROM_MODULE, t, OK_AT, 4);
    glowBurst(view, FROM_MODULE, t, HELLO_AT, 5);
    view.q<HTMLElement>('.c-hmn-at').style.opacity = String(clamp((t - AT_AT) / 150) * (1 - clamp((t - TAGS_TO) / 300)));
    view.q<HTMLElement>('.c-hmn-ok').style.opacity = String(clamp((t - OK_AT) / 150) * (1 - clamp((t - TAGS_TO) / 300)));
    showSerial(view, 'out', t, PRINTS, { fadeFrom: FADE_FROM });
    runPhone(view, 'phone', t, PHONE_LINES, FADE_FROM);
  },
};

export default hm10AtReadyCheckNrf;

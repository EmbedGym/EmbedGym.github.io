import { clamp } from '../../anim';
import type { Cell } from '../../cell';
import { phone, phoneWidth, runPhone } from '../../decor/phone';
import { USB, serialPanel, showSerial } from '../../kit';
import { AT_AT, CONNECT_AT, DURATION, FADE_FROM, HELLO_AT, OK_AT, PHONE_LINES, PRINTS, TAGS_TO, glowBurst, runHm10Link } from '../mega/hm10_at_ready_check';

// The Uno talks to the module over SoftwareSerial: TX on 7 through the
// 1 kΩ / 2 kΩ divider to RXD, RX on 8 from TXD. The module sits top left, so
// the serial monitor straddles the USB socket under it and the phone stands
// at the far left, beside the module.

export const BOARD = 'arduino-uno';
export const TO_MODULE = ['w-7-upper', 'w-upper-RXD', 'w-RXD-lower'];
export const FROM_MODULE = ['w-TXD-8'];

/** Left of the 5 V wire that runs down the board's left side. */
const COLUMN_RIGHT = -36;
const MONITOR_W = 212;
const TOP = -96;
const BOTTOM = 205;

/** The serial monitor under the module and the phone left of it, for `fontSize` px text and a `phoneChars`-character message. */
export function hm10UnoDecor(o: { fontSize: number; phoneChars: number }) {
  const f = o.fontSize;
  const sh = Math.ceil(34 + 2 * 1.36 * f + 10);
  const serial = { x: COLUMN_RIGHT - MONITOR_W, y: Math.round(USB.uno.y + 30 - sh), w: MONITOR_W, h: sh };
  const pw = phoneWidth(o.phoneChars, f);
  const ph = Math.round(2.2 * pw);
  const phoneRect = { x: serial.x - 16 - pw, y: BOTTOM - ph, w: pw, h: ph };
  return {
    html: `${serialPanel('out', serial, { note: '9600', cableTo: USB.uno, fontSize: f })}${phone('phone', { ...phoneRect, fontSize: f, title: 'HM-10' })}`,
    bounds: [phoneRect.x, TOP, COLUMN_RIGHT, BOTTOM] as [number, number, number, number],
  };
}

const FONT = 25;
// The AT/OK exchange is labelled right of pin 7's divider resistor, above the header.
const TAG = { x: 205, y: -88 };
const DECOR = hm10UnoDecor({ fontSize: FONT, phoneChars: 5 });

const hm10AtReadyCheckUno: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-hmu-tag {
          position: absolute; left: ${TAG.x}px; padding: 0 8px; border-radius: 8px; background: #fff;
          font: 700 ${FONT}px/1.36 var(--mono); border: 2px solid currentColor; opacity: 0;
        }
        .c-hmu-at { top: ${TAG.y}px; color: #0066ff; }
        .c-hmu-ok { top: ${TAG.y + 46}px; color: #00870a; }
      </style>
      ${DECOR.html}
      <div class="c-hmu-tag c-hmu-at">←AT</div>
      <div class="c-hmu-tag c-hmu-ok">OK→</div>`,
    // The tags are 3 characters wide.
    bounds: [DECOR.bounds[0], DECOR.bounds[1], TAG.x + 66, DECOR.bounds[3]],
  },
  run(t, view) {
    runHm10Link(view, t, CONNECT_AT, FADE_FROM);
    glowBurst(view, TO_MODULE, t, AT_AT, 2);
    glowBurst(view, FROM_MODULE, t, OK_AT, 4);
    glowBurst(view, FROM_MODULE, t, HELLO_AT, 5);
    view.q<HTMLElement>('.c-hmu-at').style.opacity = String(clamp((t - AT_AT) / 150) * (1 - clamp((t - TAGS_TO) / 300)));
    view.q<HTMLElement>('.c-hmu-ok').style.opacity = String(clamp((t - OK_AT) / 150) * (1 - clamp((t - TAGS_TO) / 300)));
    showSerial(view, 'out', t, PRINTS, { board: BOARD, fadeFrom: FADE_FROM });
    runPhone(view, 'phone', t, PHONE_LINES, FADE_FROM);
  },
};

export default hm10AtReadyCheckUno;

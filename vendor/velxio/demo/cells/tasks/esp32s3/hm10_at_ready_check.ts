import { clamp } from '../../anim';
import type { Cell } from '../../cell';
import { phone, phoneWidth, runPhone } from '../../decor/phone';
import { USB, serialPanel, showSerial } from '../../kit';
import { AT_AT, CONNECT_AT, DURATION, FADE_FROM, HELLO_AT, OK_AT, PHONE_LINES, PRINTS, TAGS_TO, glowBurst, runHm10Link } from '../mega/hm10_at_ready_check';

// The module runs on 3V3 and talks to UART1: GPIO5 TX → RXD, TXD → GPIO4 RX;
// no level shifter. It lies left of the board, the phone left of it; the
// console socket is at the board's bottom end, so the monitor sits under it,
// the card is tall, its scale low and its text large.

export const TO_MODULE = ['w-5-RXD'];
export const FROM_MODULE = ['w-4-TXD'];

/** Module box, cell coordinates. */
const MODULE = { x: -229, y: 99, w: 155, h: 60 };
const TOP = 30;
const PANEL_Y = 372;

/** The monitor under the socket and the phone left of the module, for `fontSize` px text and a `phoneChars`-character message. */
export function hm10Esp32s3Decor(o: { fontSize: number; phoneChars: number }) {
  const f = o.fontSize;
  const sh = Math.ceil(34 + 2 * 1.36 * f + 10);
  const serial = { x: -150, y: PANEL_Y, w: 340, h: sh };
  const pw = phoneWidth(o.phoneChars, f);
  const ph = Math.round(2.1 * pw);
  const phoneRect = { x: MODULE.x - 24 - pw, y: TOP + 10, w: pw, h: ph };
  return {
    html: `${serialPanel('out', serial, { note: '9600', cableTo: USB.esp32s3, fontSize: f })}${phone('phone', { ...phoneRect, fontSize: f, title: 'HM-10' })}`,
    bounds: [phoneRect.x, TOP, serial.x + serial.w, serial.y + serial.h] as [number, number, number, number],
  };
}

const FONT = 36;
// The AT/OK exchange is labelled under the module, left of its wires.
const TAG = { x: -190, y: 178 };
const DECOR = hm10Esp32s3Decor({ fontSize: FONT, phoneChars: 5 });

const hm10AtReadyCheckEsp32s3: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-hme-tag {
          position: absolute; left: ${TAG.x}px; padding: 0 10px; border-radius: 10px; background: #fff;
          font: 700 ${FONT}px/1.36 var(--mono); border: 3px solid currentColor; opacity: 0;
        }
        .c-hme-at { top: ${TAG.y}px; color: #0066ff; }
        .c-hme-ok { top: ${TAG.y + 62}px; color: #00870a; }
      </style>
      ${DECOR.html}
      <div class="c-hme-tag c-hme-at">←AT</div>
      <div class="c-hme-tag c-hme-ok">OK→</div>`,
    bounds: DECOR.bounds,
  },
  run(t, view) {
    runHm10Link(view, t, CONNECT_AT, FADE_FROM);
    glowBurst(view, TO_MODULE, t, AT_AT, 2);
    glowBurst(view, FROM_MODULE, t, OK_AT, 4);
    glowBurst(view, FROM_MODULE, t, HELLO_AT, 5);
    view.q<HTMLElement>('.c-hme-at').style.opacity = String(clamp((t - AT_AT) / 150) * (1 - clamp((t - TAGS_TO) / 300)));
    view.q<HTMLElement>('.c-hme-ok').style.opacity = String(clamp((t - OK_AT) / 150) * (1 - clamp((t - TAGS_TO) / 300)));
    showSerial(view, 'out', t, PRINTS, { fadeFrom: FADE_FROM });
    runPhone(view, 'phone', t, PHONE_LINES, FADE_FROM);
  },
};

export default hm10AtReadyCheckEsp32s3;

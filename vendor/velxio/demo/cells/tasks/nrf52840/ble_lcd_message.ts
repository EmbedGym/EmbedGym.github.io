import type { Cell } from '../../cell';
import { phone, phoneHeight, phoneWidth, runPhone, setPhoneLink, type PhoneLink, type PhoneMessage } from '../../decor/phone';
import { airLane, runAir, FLIGHT, type Packet } from './ble_uart_console';

type Lcd = HTMLElement & { text: string };

// A phone connects to BLE-Board, whose LCD shows its name, and writes a
// message to the custom characteristic: the first 16 characters fill the top
// row and the rest the bottom row. A 33-character write is refused with ATT
// error 0x0D (Invalid Attribute Value Length) and the LCD keeps the message;
// reading the characteristic returns it. The phone hangs up, the LCD shows
// BLE-Board again and the board advertises, which is how the loop starts.

const LCD_WIRES = ['w-P0.04-RS', 'w-P0.05-E', 'w-P0.02-D4', 'w-P0.31-D5', 'w-P0.29-D6', 'w-P0.30-D7'];
const IDLE = 'BLE-Board';
const MESSAGE = 'Pizza in the lab!';

const DURATION = 6000;
const CONNECT_AT = 400;
const WRITE_AT = 900;
const LONG_AT = 2300;
const READ_AT = 3600;
const HANG_UP_AT = 4900;
const SCAN_AGAIN_AT = 5300;
const FADE_FROM = 5300;
// The LCD is rewritten when the write lands, and cleared once the link has dropped.
const SHOWN_AT = WRITE_AT + FLIGHT;
const CLEARED_AT = HANG_UP_AT + 100;

const MESSAGES: PhoneMessage[] = [
  { t: WRITE_AT, text: MESSAGE, from: 'out' },
  { t: WRITE_AT + 2 * FLIGHT, text: 'Written', from: 'in' },
  { t: LONG_AT, text: '(33 chars)', from: 'out' },
  { t: LONG_AT + 2 * FLIGHT, text: 'Too long (0x0D)', from: 'in' },
  { t: READ_AT, text: 'Read', from: 'out' },
  { t: READ_AT + 2 * FLIGHT, text: MESSAGE, from: 'in' },
];
const PACKETS: Packet[] = [
  ...[0, 200, SCAN_AGAIN_AT, DURATION - FLIGHT].map((t): Packet => ({ t, dir: 'down', adv: true })),
  ...[WRITE_AT, LONG_AT, READ_AT].flatMap((t): Packet[] => [{ t, dir: 'up' }, { t: t + FLIGHT, dir: 'down' }]),
];

/** 16 characters a row, as the firmware writes them: the rest of each row cleared. */
const lcdText = (s: string) => `${s.slice(0, 16).padEnd(16)}${s.slice(16).padEnd(16)}`;

// Cell coordinates: the phone under the board, clear of the bottom-header wires; the radio (B1) right of it.
const FONT = 36;
const B1 = { x: 472, y: 360, w: 88, h: 70 };
const PHONE_W = phoneWidth(MESSAGE.length, FONT);
const PHONE_H = phoneHeight({ fontSize: FONT, rows: 2 });
const PHONE = { x: B1.x - 52 - PHONE_W, y: 304, w: PHONE_W, h: PHONE_H };

function link(t: number): PhoneLink {
  if (t < CONNECT_AT || t >= SCAN_AGAIN_AT) return 'scanning';
  if (t < HANG_UP_AT) return 'connected';
  return 'idle';
}

const bleLcdMessage: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${phone('phone', { ...PHONE, fontSize: FONT, title: 'BLE-Board', maxRows: 2 })}
      ${airLane('air', { x0: PHONE.x + PHONE.w, x1: B1.x, y: B1.y + B1.h / 2 })}`,
    bounds: [PHONE.x, PHONE.y, PHONE.x + PHONE.w, PHONE.y + PHONE.h],
  },
  // The LCD writes take a few ms; each burst is stretched to be seen.
  activity: [{ wires: LCD_WIRES, at: [SHOWN_AT, SHOWN_AT + 60, CLEARED_AT, CLEARED_AT + 60] }],
  run(t, view) {
    setPhoneLink(view, 'phone', link(t));
    runPhone(view, 'phone', t, MESSAGES, FADE_FROM);
    runAir(view, 'air', t, PACKETS);
    view.part<Lcd>('LCD1').text = lcdText(t >= SHOWN_AT && t < CLEARED_AT ? MESSAGE : IDLE);
  },
};

export default bleLcdMessage;

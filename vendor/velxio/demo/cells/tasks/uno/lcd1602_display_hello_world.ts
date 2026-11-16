import type { Cell } from '../../cell';
import { USB } from '../../kit';
import { BLANK, DURATION, HELLO, PLUG_IN, PLUG_OUT, PRINTED, plugOffset } from '../mega/lcd1602_display_hello_world';

type Lcd = HTMLElement & { text: string };
type Uno = HTMLElement & { ledPower: boolean };

const BOARD = 'arduino-uno';
const LCD_WIRES = ['w-12-RS', 'w-11-E', 'w-4-D4', 'w-5-D5', 'w-6-D6', 'w-7-D7'];
const SOCKET = USB.uno;

// The USB cable plugs in, setup() runs once and prints the greeting, then the cable comes out again.
const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <svg class="cell-air c-hwu-plug" viewBox="0 0 10 10" style="position:absolute;left:0;top:0">
        <path d="M -120 ${SOCKET.y} H -30" fill="none" stroke="#4b5563" stroke-width="9" stroke-linecap="round" />
        <rect x="-34" y="${SOCKET.y - 13}" width="22" height="26" rx="4" fill="#6b7280" stroke="#4b5563" stroke-width="1.5" />
        <rect x="-14" y="${SOCKET.y - 10}" width="16" height="20" rx="2" fill="#c3c9d1" stroke="#8b95a1" stroke-width="1.5" />
      </svg>`,
    bounds: [-124, SOCKET.y - 14, 2, SOCKET.y + 14],
  },
  run(t, view) {
    view.q<SVGElement>('.c-hwu-plug').style.transform = `translateX(${-plugOffset(t)}px)`;
    const powered = t >= PLUG_IN[1] && t < PLUG_OUT[1] - 200;
    view.part<Uno>(BOARD).ledPower = powered;
    view.part<Lcd>('LCD1').text = powered && t >= PRINTED ? HELLO : BLANK;
  },
  // lcd.begin and lcd.print take a few ms; the burst is stretched to be seen.
  activity: [{ wires: LCD_WIRES, at: [PRINTED - 160, PRINTED - 110, PRINTED - 60, PRINTED - 10] }],
};

export default cell;

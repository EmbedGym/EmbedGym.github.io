import type { Cell } from '../../cell';
import { USB } from '../../kit';
import { BLANK, DURATION, HELLO, PLUG_IN, PLUG_OUT, PRINTED, PULL, plugOffset } from '../mega/lcd1602_display_hello_world';

type Lcd = HTMLElement & { text: string };

const LCD_WIRES = ['w-38-RS', 'w-39-E', 'w-40-D4', 'w-41-D5', 'w-42-D6', 'w-21-D7'];
// The UART socket opens downward at the board's bottom end.
const SOCKET = USB.esp32s3;
// A shorter pull than the Mega's keeps the tall card from growing.
const DROP = 28;

// The USB cable plugs in, app_main runs once and prints the greeting, then the cable comes out again.
const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <svg class="cell-air c-hwe-plug" viewBox="0 0 10 10" style="position:absolute;left:0;top:0">
        <path d="M ${SOCKET.x} ${SOCKET.y + 52} V ${SOCKET.y + 30}" fill="none" stroke="#4b5563" stroke-width="9" stroke-linecap="round" />
        <rect x="${SOCKET.x - 13}" y="${SOCKET.y + 12}" width="26" height="22" rx="4" fill="#6b7280" stroke="#4b5563" stroke-width="1.5" />
        <rect x="${SOCKET.x - 10}" y="${SOCKET.y - 2}" width="20" height="16" rx="2" fill="#c3c9d1" stroke="#8b95a1" stroke-width="1.5" />
      </svg>`,
    // Covers the plug pulled out by DROP.
    bounds: [SOCKET.x - 14, SOCKET.y - 2, SOCKET.x + 14, SOCKET.y + 57 + DROP],
  },
  run(t, view) {
    view.q<SVGElement>('.c-hwe-plug').style.transform = `translateY(${(plugOffset(t) * DROP) / PULL}px)`;
    const powered = t >= PLUG_IN[1] && t < PLUG_OUT[1] - 200;
    view.part<Lcd>('LCD1').text = powered && t >= PRINTED ? HELLO : BLANK;
  },
  // The init and print take a few ms; the burst is stretched to be seen.
  activity: [{ wires: LCD_WIRES, at: [PRINTED - 160, PRINTED - 110, PRINTED - 60, PRINTED - 10] }],
};

export default cell;

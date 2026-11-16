import type { Cell } from '../../cell';
import { runPhone } from '../../decor/phone';
import { showSerial, type Print } from '../../kit';
import { glowBurst, runHm10Link } from '../mega/hm10_at_ready_check';
import { CONNECT_AT, DURATION, FADE_FROM, HELLO_AT, PHONE_LINES, PING_AT } from '../mega/hm10_ble_serial_passthrough';
import { BOARD, FROM_MODULE, TO_MODULE, hm10UnoDecor } from './hm10_at_ready_check';

// The sketch copies bytes both ways between the monitor (Serial) and the
// module (SoftwareSerial on 8/7). The phone's "Hello" reaches the monitor over
// TXD → 8; "Ping" typed in the monitor leaves on 7 through the divider to RXD.
const PRINTS: Print[] = [
  { t: HELLO_AT + 8, text: 'Hello' },
  { t: PING_AT, text: '<span class="c-hpu-typed">&gt; Ping</span>' },
];
const DECOR = hm10UnoDecor({ fontSize: 25, phoneChars: 5 });

const hm10BleSerialPassthroughUno: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>.c-hpu-typed { color: var(--muted); }</style>
      ${DECOR.html}`,
    bounds: DECOR.bounds,
  },
  run(t, view) {
    runHm10Link(view, t, CONNECT_AT, FADE_FROM);
    glowBurst(view, FROM_MODULE, t, HELLO_AT, 5);
    glowBurst(view, TO_MODULE, t, PING_AT, 4);
    showSerial(view, 'out', t, PRINTS, { board: BOARD, fadeFrom: FADE_FROM });
    // "> Ping" is the user's input, not the board's output: no TX blink for it.
    if (t >= PING_AT && t < PING_AT + 90) view.part<HTMLElement & { ledTX: boolean }>(BOARD).ledTX = false;
    runPhone(view, 'phone', t, PHONE_LINES, FADE_FROM);
  },
};

export default hm10BleSerialPassthroughUno;

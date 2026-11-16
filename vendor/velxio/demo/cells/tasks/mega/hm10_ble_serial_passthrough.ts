import type { Cell } from '../../cell';
import { runPhone, type PhoneMessage } from '../../decor/phone';
import { showSerial, type Print } from '../../kit';
import { glowBurst, HM10_BOTTOM, HM10_TOP, hm10Decor, runHm10Link } from './hm10_at_ready_check';

// The sketch copies bytes both ways between the monitor (Serial) and the
// module (Serial1). As in the test, a phone connects and sends "Hello", which
// reaches the monitor over TXD → 19; then "Ping" typed in the monitor goes out
// on 18 through the level shifter to the module, and on to the phone.
export const DURATION = 6000;
export const CONNECT_AT = 800;
export const HELLO_AT = 1500;
export const PING_AT = 3200;
export const FADE_FROM = 5500;
const TO_MODULE = ['w-18-HV1', 'w-LV1-RXD'];
const FROM_MODULE = ['w-TXD-19'];

const PRINTS: Print[] = [
  { t: HELLO_AT + 8, text: 'Hello' },
  { t: PING_AT, text: '<span class="c-hp-typed">&gt; Ping</span>' },
];
export const PHONE_LINES: PhoneMessage[] = [
  { t: HELLO_AT, text: 'Hello', from: 'out' },
  { t: PING_AT + 8, text: 'Ping', from: 'in' },
];

const DECOR = hm10Decor({ fontSize: 25, monitorRows: 2, phoneChars: 5, top: HM10_TOP, bottom: HM10_BOTTOM });

const hm10BleSerialPassthrough: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>.c-hp-typed { color: var(--muted); }</style>
      ${DECOR.html}`,
    bounds: DECOR.bounds,
  },
  run(t, view) {
    runHm10Link(view, t, CONNECT_AT, FADE_FROM);
    glowBurst(view, FROM_MODULE, t, HELLO_AT, 5);
    glowBurst(view, TO_MODULE, t, PING_AT, 4);
    showSerial(view, 'out', t, PRINTS, { board: 'arduino-mega', fadeFrom: FADE_FROM });
    // "> Ping" is the user's input, not the board's output: no TX blink for it.
    if (t >= PING_AT && t < PING_AT + 90) view.part<HTMLElement & { ledTX: boolean }>('arduino-mega').ledTX = false;
    runPhone(view, 'phone', t, PHONE_LINES, FADE_FROM);
  },
};

export default hm10BleSerialPassthrough;

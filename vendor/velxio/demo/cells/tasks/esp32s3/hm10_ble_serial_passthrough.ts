import type { Cell } from '../../cell';
import { runPhone } from '../../decor/phone';
import { showSerial, type Print } from '../../kit';
import { glowBurst, runHm10Link } from '../mega/hm10_at_ready_check';
import { CONNECT_AT, DURATION, FADE_FROM, HELLO_AT, PHONE_LINES, PING_AT } from '../mega/hm10_ble_serial_passthrough';
import { FROM_MODULE, TO_MODULE, hm10Esp32s3Decor } from './hm10_at_ready_check';

// The firmware relays bytes both ways between the console and the module's
// UART. The phone's "Hello" reaches the monitor over TXD; "Ping" typed in the
// monitor goes out to RXD and on to the phone.
const PRINTS: Print[] = [
  { t: HELLO_AT + 8, text: 'Hello' },
  { t: PING_AT, text: '<span class="c-hpe-typed">&gt; Ping</span>' },
];
const DECOR = hm10Esp32s3Decor({ fontSize: 36, phoneChars: 5 });

const hm10BleSerialPassthroughEsp32s3: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>.c-hpe-typed { color: var(--muted); }</style>
      ${DECOR.html}`,
    bounds: DECOR.bounds,
  },
  run(t, view) {
    runHm10Link(view, t, CONNECT_AT, FADE_FROM);
    glowBurst(view, FROM_MODULE, t, HELLO_AT, 5);
    glowBurst(view, TO_MODULE, t, PING_AT, 4);
    showSerial(view, 'out', t, PRINTS, { fadeFrom: FADE_FROM });
    runPhone(view, 'phone', t, PHONE_LINES, FADE_FROM);
  },
};

export default hm10BleSerialPassthroughEsp32s3;

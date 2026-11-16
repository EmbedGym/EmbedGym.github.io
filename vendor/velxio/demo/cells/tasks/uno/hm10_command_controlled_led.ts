import type { Cell } from '../../cell';
import { runPhone } from '../../decor/phone';
import { showSerial } from '../../kit';
import { glowBurst, runHm10Link } from '../mega/hm10_at_ready_check';
import { ACK_DELAY, CONNECT_AT, DURATION, FADE_FROM, OFF_AT, ON_AT, PHONE_LINES, PRINTS, X_AT } from '../mega/hm10_command_controlled_led';
import { BOARD, FROM_MODULE, TO_MODULE, hm10UnoDecor } from './hm10_at_ready_check';

// A phone connects and sends single-character commands. Each arrives over
// TXD → 8; '1' lights the LED on pin 4 and '0' turns it off, and both answer
// "LED=ON" / "LED=OFF" to the phone (7 → divider → RXD) and to the monitor.
// The 'x' in between is ignored, as in the test.
const LED_WIRES = ['w-4-resistor', 'w-resistor-LED'];
const DECOR = hm10UnoDecor({ fontSize: 26, phoneChars: 7 });

const hm10CommandControlledLedUno: Cell = {
  duration: DURATION,
  decor: DECOR,
  run(t, view) {
    runHm10Link(view, t, CONNECT_AT, FADE_FROM);
    for (const at of [ON_AT, X_AT, OFF_AT]) glowBurst(view, FROM_MODULE, t, at, 1);
    glowBurst(view, TO_MODULE, t, ON_AT + ACK_DELAY, 8);
    glowBurst(view, TO_MODULE, t, OFF_AT + ACK_DELAY, 9);

    const ledOn = t >= ON_AT && t < OFF_AT;
    view.part<HTMLElement & { value: boolean }>('L1').value = ledOn;
    if (ledOn) for (const id of LED_WIRES) view.glowWire(id, 1);

    showSerial(view, 'out', t, PRINTS, { board: BOARD, fadeFrom: FADE_FROM });
    runPhone(view, 'phone', t, PHONE_LINES, FADE_FROM);
  },
};

export default hm10CommandControlledLedUno;

import type { Cell } from '../../cell';
import { runPhone, type PhoneMessage } from '../../decor/phone';
import { showSerial, type Print } from '../../kit';
import { glowBurst, HM10_BOTTOM, hm10Decor, runHm10Link } from './hm10_at_ready_check';

// A phone connects and sends single-character commands. Each arrives over
// TXD → 19; '1' lights the LED on pin 4 and '0' turns it off, and both answer
// "LED=ON" / "LED=OFF" to the phone (18 → shifter → RXD) and to the monitor.
// The 'x' in between is ignored, as in the test.
export const DURATION = 7000;
export const CONNECT_AT = 500;
export const ON_AT = 1300;
export const X_AT = 3000;
export const OFF_AT = 4600;
export const FADE_FROM = 6500;
const TO_MODULE = ['w-18-HV1', 'w-LV1-RXD'];
const FROM_MODULE = ['w-TXD-19'];
const LED_WIRES = ['w-4-resistor', 'w-resistor-LED'];
// The sketch answers within a millisecond of the command; the ack is drawn after the command's glow so the order reads.
export const ACK_DELAY = 300;

export const PRINTS: Print[] = [
  { t: ON_AT + ACK_DELAY, text: 'LED=ON' },
  { t: OFF_AT + ACK_DELAY, text: 'LED=OFF' },
];
export const PHONE_LINES: PhoneMessage[] = [
  { t: ON_AT, text: '1', from: 'out' },
  { t: ON_AT + ACK_DELAY, text: 'LED=ON', from: 'in' },
  { t: X_AT, text: 'x', from: 'out' },
  { t: OFF_AT, text: '0', from: 'out' },
  { t: OFF_AT + ACK_DELAY, text: 'LED=OFF', from: 'in' },
];
// The LED above the top header raises the circuit's top edge.
const DECOR = hm10Decor({ fontSize: 26, monitorRows: 2, phoneChars: 7, top: -57, bottom: HM10_BOTTOM });

const hm10CommandControlledLed: Cell = {
  duration: DURATION,
  decor: {
    html: DECOR.html,
    bounds: DECOR.bounds,
  },
  run(t, view) {
    runHm10Link(view, t, CONNECT_AT, FADE_FROM);
    for (const at of [ON_AT, X_AT, OFF_AT]) glowBurst(view, FROM_MODULE, t, at, 1);
    glowBurst(view, TO_MODULE, t, ON_AT + ACK_DELAY, 8);
    glowBurst(view, TO_MODULE, t, OFF_AT + ACK_DELAY, 9);

    const ledOn = t >= ON_AT && t < OFF_AT;
    view.part<HTMLElement & { value: boolean }>('L1').value = ledOn;
    if (ledOn) for (const id of LED_WIRES) view.glowWire(id, 1);

    showSerial(view, 'out', t, PRINTS, { board: 'arduino-mega', fadeFrom: FADE_FROM });
    runPhone(view, 'phone', t, PHONE_LINES, FADE_FROM);
  },
};

export default hm10CommandControlledLed;

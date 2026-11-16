import { USB } from '../../kit';
import { EVENTS } from '../mega/gas_alarm_haptic';
import { gasAlarmCell } from '../uno/gas_alarm_haptic';

// main() follows the same story: "Warming up", a silent baseline, then a report
// a second. AO reaches P0.03 (AIN1) through the x0.6 divider and the SAADC
// (gain 1/6, 0.6 V reference, 12 bits) reads 4096 counts per 3.6 V, so the 1 V
// baseline reads 683. ALARM END also writes GO = 0 to stop the effect.
// The modules hang below and above the board; the panel and the monitor share
// a column left of the board, set large for the wide card.
const FONT = 38;
const SERIAL = { x: -650, y: 112, w: 600, h: 34 + 3 * FONT * 1.36 + 10, font: FONT };
const PANEL = { x: -650, y: -112, w: 280, zoom: 1.4 };

export default gasAlarmCell({
  board: 'nrf52840-dk',
  usb: USB.nrf52840,
  pre: 'c-gan',
  baseline: 683,
  pin: 'P0.03',
  wires: { ao: ['w2', 'w3', 'w4'], do: ['w6', 'w7'], led: ['w15', 'w16'], i2c: ['w11', 'w12'] },
  doColour: '#0000ff',
  i2cAt: EVENTS.filter((e) => e.text === 'ALARM END').map((e) => e.t),
  serial: SERIAL,
  panel: PANEL,
  // GAS1 is turned 180°, so its sensing dome is at the right end.
  gas: (box) => ({
    from: { x: box.x + box.w - 60, y: box.y - 64 },
    dome: { x: box.x + box.w - 40, y: box.y + box.h - 34 },
    knob: { x: box.x + 10, y: box.y - 75 },
    top: box.y,
  }),
  // The breakout is turned 270°, so the motor disc is on its left and the arcs go above and below it.
  motor: (box) => ({ x: box.x + 20, y: box.y + 48 }),
  motorTurn: 90,
  bounds: [SERIAL.x, PANEL.y, SERIAL.x + SERIAL.w, SERIAL.y + SERIAL.h],
});

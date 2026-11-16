import { USB } from '../../kit';
import { buttonCycleCell } from '../mega/l298n_motor_speed_button_cycle';

// The motor stands right of the driver upside down, its wires coming over from
// OUT1/OUT2 on the driver's top edge; the button sits left of it, under the finger.
const MOTOR = { x: 545, y: -190 };
export default buttonCycleCell({
  prefix: 'c-l298bn',
  board: 'nrf52840-dk',
  usb: USB.nrf52840,
  serial: { x: -440, y: 52, w: 410, h: 142 },
  motor: MOTOR,
  motorPins: 'top',
  bar: { x: MOTOR.x + 64, y: MOTOR.y + 20 },
  tag: { x: -400, y: -70 },
  viaA: [{ x: 325.2, y: -205 }, { x: MOTOR.x + 15 * 1.15, y: -205 }],
  viaB: [{ x: 303.6, y: -215 }, { x: MOTOR.x + 29 * 1.15, y: -215 }],
  // The firmware polls every 5 ms and takes a press at once when the last edge is over 30 ms old.
  lag: 5,
  printMs: 2,
  baud: '115200',
  font: 36,
  tagFont: 36,
});

import { USB } from '../../kit';
import { buttonCycleCell } from '../mega/l298n_motor_speed_button_cycle';

// The driver stands beside the board, so the motor stands to its right, upside
// down, its wires coming over from OUT1/OUT2 on the driver's top edge.
const MOTOR = { x: 352, y: -100 };
export default buttonCycleCell({
  prefix: 'c-l298be',
  board: 'esp32-s3',
  usb: USB.esp32s3,
  serial: { x: -200, y: 372, w: 530, h: 132 },
  motor: MOTOR,
  motorPins: 'top',
  bar: { x: MOTOR.x + 64, y: MOTOR.y + 20 },
  tag: { x: 160, y: 80 },
  viaA: [{ x: 225.2, y: -128 }, { x: MOTOR.x + 15 * 1.15, y: -128 }],
  viaB: [{ x: 203.6, y: -138 }, { x: MOTOR.x + 29 * 1.15, y: -138 }],
  // The firmware polls every 5 ms and takes a press at once when the last edge is over 30 ms old.
  lag: 5,
  printMs: 2,
  baud: '115200',
  font: 48,
  tagFont: 48,
});

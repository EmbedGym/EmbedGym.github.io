import { USB } from '../../kit';
import { buttonCycleCell } from '../mega/l298n_motor_speed_button_cycle';

// The Uno sits where the Mega does, so the driver, motor and wires keep their
// Mega positions; only the board id and the console socket change.
const MOTOR = { x: -110, y: -205 };
export default buttonCycleCell({
  prefix: 'c-l298bu',
  board: 'arduino-uno',
  usb: USB.uno,
  serial: { x: -380, y: 0, w: 340, h: 128 },
  motor: MOTOR,
  tag: { x: -354, y: -120.4 },
  viaA: [{ x: 28, y: -105.2 }, { x: 28, y: -82 }, { x: MOTOR.x + 29 * 1.15, y: -82 }],
  viaB: [{ x: 36, y: -83.6 }, { x: 36, y: -74 }, { x: MOTOR.x + 15 * 1.15, y: -74 }],
  font: 30,
});

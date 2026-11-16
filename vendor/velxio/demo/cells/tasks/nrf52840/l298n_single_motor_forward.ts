import { singleMotorCell } from '../mega/l298n_single_motor_forward';

// Driver OUT2, cell coordinates (circuit.ts minus the board's top-left).
export default singleMotorCell('c-l298fn', { x: 303.6, y: -157.8 }, 30, 10);

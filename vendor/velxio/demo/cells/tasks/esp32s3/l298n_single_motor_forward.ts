import { singleMotorCell } from '../mega/l298n_single_motor_forward';

// Driver OUT2, cell coordinates (circuit.ts minus the board's top-left).
export default singleMotorCell('c-l298fe', { x: 203.6, y: -132.8 }, 30, 10);

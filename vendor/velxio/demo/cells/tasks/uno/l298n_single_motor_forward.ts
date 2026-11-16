import { singleMotorCell } from '../mega/l298n_single_motor_forward';

// Driver OUT2, cell coordinates (circuit.ts minus the Uno's top-left).
export default singleMotorCell('c-l298fu', { x: 383.6, y: -115.5 }, 24, 10);

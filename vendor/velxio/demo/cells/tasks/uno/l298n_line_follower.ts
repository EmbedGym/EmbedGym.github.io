import { USB } from '../../kit';
import { lineFollowerCell } from '../mega/l298n_line_follower';

// The Uno sits where the Mega does; the driver and motors keep their Mega
// positions, the sensor sits higher so its three signal wires clear the board.
export default lineFollowerCell('c-l298lu', 'arduino-uno', USB.uno, { x: 291.6, y: -165 }, 33);

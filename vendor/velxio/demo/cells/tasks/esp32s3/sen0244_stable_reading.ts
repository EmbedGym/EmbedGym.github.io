import { USB } from '../../kit';
import { stableReadingCell } from '../mega/sen0244_stable_reading';

// As in esp32s3/sen0244_tds_read: the module left of the board, its A pin
// level with GPIO 9. The short lines let the serial panel sit right of the
// board, its cable coming round under the down-facing UART socket.
export default stableReadingCell({
  board: 'esp32-s3',
  usb: USB.esp32s3,
  serial: { x: 150, y: 180, w: 340, h: 130 },
  font: 30,
  glass: { x: -81, y: 269.9 },
  signalWire: 'w-9-signal',
  ppm: 300,
  // Wet from about 620 ms, so 22 of the 30 samples are wet by the 1500 ms print.
  fill: [450, 800],
});

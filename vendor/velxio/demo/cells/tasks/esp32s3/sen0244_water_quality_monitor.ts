import { USB } from '../../kit';
import { waterQualityCell } from '../mega/sen0244_water_quality_monitor';

// As in esp32s3/sen0244_tds_read: the module left of the board, its A pin
// level with GPIO 9; the serial panel under the down-facing UART socket.
export default waterQualityCell({
  board: 'esp32-s3',
  usb: USB.esp32s3,
  serial: { x: -260, y: 380, w: 700, h: 150 },
  font: 36,
  glass: { x: -81, y: 269.9 },
  signalWire: 'w-9-signal',
  ppm: [88, 220, 390, 692],
});

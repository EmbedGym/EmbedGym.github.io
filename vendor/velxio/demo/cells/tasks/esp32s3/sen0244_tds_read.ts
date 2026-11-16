import { USB } from '../../kit';
import { tdsReadCell } from '../mega/sen0244_tds_read';

// The module sits left of the board with its A pin level with GPIO 9, so the
// signal runs straight; + climbs to 3V3 and − drops to GND beside it. The
// serial panel hangs under the down-facing UART socket.
export default tdsReadCell({
  board: 'esp32-s3',
  usb: USB.esp32s3,
  serial: { x: -230, y: 380, w: 640, h: 104 },
  font: 36,
  glass: { x: -81, y: 269.9 },
  signalWire: 'w-9-signal',
  wet: 'Voltage: 0.67 V TDS: 250 ppm',
});

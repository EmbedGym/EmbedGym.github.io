import { USB } from '../../kit';
import { SKY_SPREAD } from '../mega/gps_fix_status';
import { gpsRawCell } from '../mega/gps_raw_msg';

// UART1: the module's TX reaches GPIO4. Layout as esp32s3/gps_fix_status. The
// card is tall and its scale low, so the text is large and the monitor wide
// and two rows tall.
const FONT = 49;
const PANEL = { x: -800, y: 372, w: 1350, h: 205 };
const GPS_TOP = -42 - 60;

export default gpsRawCell({
  board: 'esp32-s3',
  usb: USB.esp32s3,
  txWire: 'w-4-TX',
  prefix: 'c-rawe-',
  serialKey: 'rawe',
  homes: SKY_SPREAD,
  panel: PANEL,
  fontSize: FONT,
  bounds: [PANEL.x, GPS_TOP - 4, PANEL.x + PANEL.w, PANEL.y + PANEL.h],
});

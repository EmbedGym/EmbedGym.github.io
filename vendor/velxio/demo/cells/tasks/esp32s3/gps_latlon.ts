import { USB } from '../../kit';
import { SKY_SPREAD } from '../mega/gps_fix_status';
import { gpsLatlonCell } from '../mega/gps_latlon';

// UART1: the module's TX reaches GPIO4. Layout as esp32s3/gps_fix_status. The
// card is tall and its scale low, so the text is large and the monitor wide
// enough for a whole position line.
const FONT = 47;
const PANEL = { x: -560, y: 372, w: 1090, h: 186 };
const GPS_TOP = -42 - 60;

export default gpsLatlonCell({
  board: 'esp32-s3',
  usb: USB.esp32s3,
  txWire: 'w-4-TX',
  prefix: 'c-glle-',
  homes: SKY_SPREAD,
  lagged: true,
  panel: PANEL,
  wrap: false,
  fontSize: FONT,
  chip: { x: -420, y: 24 },
  chipFont: FONT,
  bounds: [PANEL.x, GPS_TOP - 4, PANEL.x + PANEL.w, PANEL.y + PANEL.h],
});

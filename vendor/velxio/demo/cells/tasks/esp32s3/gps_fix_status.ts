import { USB } from '../../kit';
import { gpsFixStatusCell, SKY_SPREAD } from '../mega/gps_fix_status';

// UART1 on GPIO4/5: the module's TX reaches GPIO4. The GPS sits up and left of
// the board; the console socket is at the board's bottom end, so the card is
// tall, its scale low and its text large.
const FONT = 47;
const PANEL = { x: -160, y: 372, w: 370, h: 186 };
const GPS_TOP = -42 - 60;

export default gpsFixStatusCell({
  board: 'esp32-s3',
  usb: USB.esp32s3,
  txWire: 'w-4-TX',
  prefix: 'c-gpse-',
  homes: SKY_SPREAD,
  lagged: true,
  panel: PANEL,
  fontSize: FONT,
  chip: { x: -420, y: 24 },
  chipFont: FONT,
  bounds: [-420, GPS_TOP - 4, PANEL.x + PANEL.w, PANEL.y + PANEL.h],
});

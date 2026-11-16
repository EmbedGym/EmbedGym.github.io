import { USB } from '../../kit';
import { gpsFixStatusCell, SKY_SPREAD } from '../mega/gps_fix_status';

// SoftwareSerial(8, 7): the module's TX reaches pin 8. The GPS sits above the
// right end of the board, with the satellites up to its left as on the Mega.
const FONT = 28;
const PANEL = { x: -270, y: USB.uno.y - 62, w: 240, h: 124 };
const GPS_TOP = 38 - 200;

export default gpsFixStatusCell({
  board: 'arduino-uno',
  usb: USB.uno,
  txWire: 'w-8-TX',
  prefix: 'c-gpsu-',
  homes: SKY_SPREAD,
  lagged: true,
  panel: PANEL,
  fontSize: FONT,
  chip: { x: PANEL.x, y: PANEL.y - 54 },
  chipFont: FONT,
  bounds: [PANEL.x, GPS_TOP - 4, PANEL.x + PANEL.w, PANEL.y + PANEL.h],
});

import { USB } from '../../kit';
import { SKY_SPREAD } from '../mega/gps_fix_status';
import { gpsRawCell } from '../mega/gps_raw_msg';

// SoftwareSerial(8, 7): the module's TX reaches pin 8. Layout as uno/gps_fix_status.
const FONT = 30;
// Wide enough to show each sentence up to its position fields.
const PANEL = { x: -570, y: -128, w: 515, h: 256 };
const GPS_TOP = 38 - 200;

export default gpsRawCell({
  board: 'arduino-uno',
  usb: USB.uno,
  txWire: 'w-8-TX',
  prefix: 'c-rawu-',
  serialKey: 'rawu',
  homes: SKY_SPREAD,
  panel: PANEL,
  fontSize: FONT,
  bounds: [PANEL.x, GPS_TOP - 4, PANEL.x + PANEL.w, PANEL.y + PANEL.h],
});

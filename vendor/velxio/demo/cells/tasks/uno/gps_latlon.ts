import { USB } from '../../kit';
import { SKY_SPREAD } from '../mega/gps_fix_status';
import { gpsLatlonCell } from '../mega/gps_latlon';

// SoftwareSerial(8, 7): the module's TX reaches pin 8. Layout as uno/gps_fix_status.
const FONT = 28;
const PANEL = { x: -370, y: USB.uno.y - 102, w: 340, h: 205 };
const GPS_TOP = 38 - 200;

export default gpsLatlonCell({
  board: 'arduino-uno',
  usb: USB.uno,
  txWire: 'w-8-TX',
  prefix: 'c-gllu-',
  homes: SKY_SPREAD,
  lagged: true,
  panel: PANEL,
  wrap: true,
  fontSize: FONT,
  chip: { x: PANEL.x, y: PANEL.y - 54 },
  chipFont: FONT,
  bounds: [PANEL.x, GPS_TOP - 4, PANEL.x + PANEL.w, PANEL.y + PANEL.h],
});

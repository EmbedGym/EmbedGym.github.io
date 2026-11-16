import { USB } from '../../kit';
import { SKY_SPREAD } from '../mega/gps_fix_status';
import { gpsGgaCell } from '../mega/gps_gga_msg';

// SoftwareSerial(8, 7): the module's TX reaches pin 8. Layout as uno/gps_fix_status;
// the sentence box sits left of the GPS, above the TX wire and the monitor.
const FONT = 31;
const PANEL = { x: -630, y: -30, w: 600, h: 222 };
const GPS_TOP = 38 - 200;

export default gpsGgaCell({
  board: 'arduino-uno',
  usb: USB.uno,
  txWire: 'w-8-TX',
  prefix: 'c-ggau-',
  homes: SKY_SPREAD,
  panel: PANEL,
  fontSize: FONT,
  stream: { x: -96, y: -190 },
  streamScale: FONT / 24,
  bounds: [PANEL.x, -192, PANEL.x + PANEL.w, PANEL.y + PANEL.h],
});

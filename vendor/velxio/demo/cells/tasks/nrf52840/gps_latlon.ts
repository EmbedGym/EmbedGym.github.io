import { USB } from '../../kit';
import { SKY_SPREAD } from '../mega/gps_fix_status';
import { gpsLatlonCell } from '../mega/gps_latlon';

// uart1: the module's TX reaches P1.01. Layout as nrf52840/gps_fix_status.
const FONT = 31;
const PANEL = { x: -400, y: USB.nrf52840.y - 111, w: 370, h: 222 };
const GPS_TOP = -100 - 60;

export default gpsLatlonCell({
  board: 'nrf52840-dk',
  usb: USB.nrf52840,
  txWire: 'w-P1.01-TX',
  prefix: 'c-glln-',
  homes: SKY_SPREAD,
  lagged: true,
  panel: PANEL,
  wrap: true,
  fontSize: FONT,
  chip: { x: PANEL.x, y: PANEL.y - 60 },
  chipFont: FONT,
  bounds: [PANEL.x, GPS_TOP - 4, PANEL.x + PANEL.w, PANEL.y + PANEL.h],
});

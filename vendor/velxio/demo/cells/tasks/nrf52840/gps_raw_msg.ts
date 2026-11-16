import { USB } from '../../kit';
import { SKY_SPREAD } from '../mega/gps_fix_status';
import { gpsRawCell } from '../mega/gps_raw_msg';

// uart1: the module's TX reaches P1.01. Layout as nrf52840/gps_fix_status.
const FONT = 32;
const PANEL = { x: -400, y: USB.nrf52840.y - 137, w: 370, h: 274 };
const GPS_TOP = -100 - 60;

export default gpsRawCell({
  board: 'nrf52840-dk',
  usb: USB.nrf52840,
  txWire: 'w-P1.01-TX',
  prefix: 'c-rawn-',
  serialKey: 'rawn',
  homes: SKY_SPREAD,
  panel: PANEL,
  fontSize: FONT,
  bounds: [PANEL.x, GPS_TOP - 4, PANEL.x + PANEL.w, PANEL.y + PANEL.h],
});

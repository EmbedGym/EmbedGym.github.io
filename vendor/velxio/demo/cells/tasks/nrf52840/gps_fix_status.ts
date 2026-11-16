import { USB } from '../../kit';
import { gpsFixStatusCell, SKY_SPREAD } from '../mega/gps_fix_status';

// uart1: the module's TX reaches P1.01. The GPS sits above the board's right
// end, its supply wires running round that end to the bottom header.
const FONT = 31;
const PANEL = { x: -290, y: USB.nrf52840.y - 67, w: 260, h: 134 };
const GPS_TOP = -100 - 60;

export default gpsFixStatusCell({
  board: 'nrf52840-dk',
  usb: USB.nrf52840,
  txWire: 'w-P1.01-TX',
  prefix: 'c-gpsn-',
  homes: SKY_SPREAD,
  lagged: true,
  panel: PANEL,
  fontSize: FONT,
  chip: { x: PANEL.x, y: PANEL.y - 60 },
  chipFont: FONT,
  bounds: [PANEL.x, GPS_TOP - 4, PANEL.x + PANEL.w, PANEL.y + PANEL.h],
});

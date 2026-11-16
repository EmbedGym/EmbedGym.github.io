import { USB } from '../../kit';
import { SKY_SPREAD } from '../mega/gps_fix_status';
import { gpsGgaCell } from '../mega/gps_gga_msg';

// uart1: the module's TX reaches P1.01. Layout as nrf52840/gps_fix_status; the
// sentence box sits above the board's left end, its tags in one row.
const FONT = 32;
const PANEL = { x: -430, y: -50, w: 400, h: 330 };

export default gpsGgaCell({
  board: 'nrf52840-dk',
  usb: USB.nrf52840,
  txWire: 'w-P1.01-TX',
  prefix: 'c-ggan-',
  homes: SKY_SPREAD,
  panel: PANEL,
  fontSize: FONT,
  stream: { x: -10, y: -152 },
  streamRow: true,
  streamScale: FONT / 24,
  bounds: [PANEL.x, -162, PANEL.x + PANEL.w, PANEL.y + PANEL.h],
});

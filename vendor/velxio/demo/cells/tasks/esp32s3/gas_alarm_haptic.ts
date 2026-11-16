import { USB } from '../../kit';
import { gasAlarmCell } from '../uno/gas_alarm_haptic';

// app_main follows the same story: "Warming up", a silent baseline, then a
// report a second. AO reaches GPIO4 through the x0.6 divider and the 12-bit,
// 11 dB ADC reads 4095/3300 counts per mV, so the 1 V baseline reads 744.
// The console socket is at the board's bottom end, so the monitor sits under
// it, as wide as the card and set large; the panel is right of the board.
const FONT = 44;
const SERIAL = { x: -276, y: 370, w: 676, h: 34 + 3 * FONT * 1.36 + 10, font: FONT };
const PANEL = { x: 136, y: 120, w: 280, zoom: 1.4 };

export default gasAlarmCell({
  board: 'esp32-s3',
  usb: USB.esp32s3,
  pre: 'c-gae',
  baseline: 744,
  pin: 'GPIO4',
  wires: { ao: ['w2', 'w3', 'w4'], do: ['w6', 'w7'], led: ['w15', 'w16'], i2c: ['w11', 'w12'] },
  doColour: '#0000ff',
  i2cAt: [],
  serial: SERIAL,
  panel: PANEL,
  gas: (box) => ({ from: { x: box.x + 60, y: box.y - 64 }, dome: { x: box.x + 40, y: box.y + 34 }, knob: { x: box.x + 20, y: box.y - 100 }, top: box.y }),
  // The breakout is turned 90°, so the motor disc is on its right and the arcs go above and below it.
  motor: (box) => ({ x: box.x + 91.2, y: box.y + 48 }),
  motorTurn: 90,
  bounds: [SERIAL.x, PANEL.y, PANEL.x + PANEL.w * PANEL.zoom, SERIAL.y + SERIAL.h],
});

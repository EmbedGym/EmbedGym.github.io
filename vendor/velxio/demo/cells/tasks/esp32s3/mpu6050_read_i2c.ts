import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial } from '../../kit';
import { DURATION, inputBox, inputBoxH, mpuPrints, runInput } from '../uno/mpu6050_read_i2c';

// The ESP-IDF firmware reads GPIO38/39 and prints the same line every vTaskDelay(200) plus its read.
const PRINTS = mpuPrints(2, 202);
const FONT = 28;
// Left of the board, the Sensor input box above the monitor; the monitor ends above the console
// socket, so its cable leaves the bottom and comes up into the socket from below.
const INPUT = { x: -420, y: -6, w: 260 };
// One reading on three rows: 34 + 3 x 38.1 + 10.
const PANEL = { x: -420, y: -6 + inputBoxH(FONT) + 16, w: 400, h: 158 };
// The cable's run under the plug (kit.ts: 20 px below the socket's 362).
const CABLE_BOTTOM = 384;

const mpu6050ReadI2cEsp32s3: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${inputBox('in', INPUT, FONT)}
      ${serialPanel('out', PANEL, { note: '115200', cableTo: USB.esp32s3, wrap: true, fontSize: FONT })}`,
    bounds: [PANEL.x, -6, 226.4, CABLE_BOTTOM],
  },
  activity: [{ wires: ['w-38-SDA', 'w-39-SCL'], at: PRINTS.map((p) => p.t - 2) }],
  run(t, view) {
    runInput(view, 'in', t);
    showSerial(view, 'out', t, PRINTS, { fadeFrom: DURATION - 300 });
  },
};

export default mpu6050ReadI2cEsp32s3;

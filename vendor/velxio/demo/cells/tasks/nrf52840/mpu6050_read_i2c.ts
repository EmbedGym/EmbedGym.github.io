import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial } from '../../kit';
import { DURATION, inputBox, inputBoxH, mpuPrints, runInput } from '../uno/mpu6050_read_i2c';

// The Zephyr firmware reads P0.21/P0.27 and prints the same line every k_msleep(200) plus its read
// and the polled printk.
const PRINTS = mpuPrints(2, 206);
// The card is wide (the monitor left of the 516 px board), so the text is larger.
const FONT = 36;
// One reading on three rows: 34 + 3 x 49 + 10.
const PANEL = { x: -535, y: 40, w: 515, h: 191 };
// Above the monitor.
const INPUT = { x: PANEL.x, y: PANEL.y - 16 - inputBoxH(FONT), w: 330 };

const mpu6050ReadI2cNrf52840: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${inputBox('in', INPUT, FONT)}
      ${serialPanel('out', PANEL, { note: '115200', cableTo: USB.nrf52840, wrap: true, fontSize: FONT })}`,
    bounds: [PANEL.x, INPUT.y, 516, 248],
  },
  activity: [{ wires: ['w-P0.21-SDA', 'w-P0.27-SCL'], at: PRINTS.map((p) => p.t - 2) }],
  run(t, view) {
    runInput(view, 'in', t);
    showSerial(view, 'out', t, PRINTS, { fadeFrom: DURATION - 300 });
  },
};

export default mpu6050ReadI2cNrf52840;

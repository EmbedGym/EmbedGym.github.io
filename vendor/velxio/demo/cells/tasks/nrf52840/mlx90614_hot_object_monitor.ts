import type { Cell } from '../../cell';
import { mug, runMug } from '../../decor/mug';
import { USB, serialPanel, showSerial } from '../../kit';
import { DURATION, mugAway, printsFor } from '../mega/mlx90614_hot_object_monitor';

// The Zephyr build prints the Mega sketch's lines (printk "%.1f"), 115200 baud, HOT from 30 °C.
// Its first reading is 250 ms after boot, then one every second.
const READS = [250, 1250, 2250, 3250, 4250, 5250];
const PRINTS = printsFor(READS);
const I2C_WIRES = ['w-P0.21-SDA', 'w-P0.27-SCL'];

const PANEL = { x: -453, y: 30, w: 431, h: 175 };
// Beside the sensor, above the board.
const SPOT = { x: 32, y: -104 };

const mlx90614HotObjectMonitorNrf52840: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('mlx-hot-n', PANEL, { note: '115200', cableTo: USB.nrf52840, wrap: true, fontSize: 32 })}
      <div style="position:absolute;left:${SPOT.x}px;top:${SPOT.y}px">${mug('mhn')}</div>`,
    bounds: [PANEL.x, SPOT.y - 24, SPOT.x + 46, PANEL.y + PANEL.h],
  },
  activity: [{ wires: I2C_WIRES, at: READS }],
  run(t, view) {
    runMug(view, 'mhn', t, { away: mugAway(t) });
    showSerial(view, 'mlx-hot-n', t, PRINTS);
  },
};

export default mlx90614HotObjectMonitorNrf52840;

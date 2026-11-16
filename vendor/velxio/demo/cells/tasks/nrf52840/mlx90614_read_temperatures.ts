import type { Cell } from '../../cell';
import { mug, runMug } from '../../decor/mug';
import { USB, serialPanel, showSerial } from '../../kit';
import { DURATION, away, printsFor } from '../mega/mlx90614_read_temperatures';

// The Zephyr build prints the Mega sketch's lines (printk "%.2f"), 115200 baud. It reads at once,
// then every second.
const READS = [0, 1000, 2000, 3000, 4000, 5000];
const PRINTS = printsFor(READS);
const I2C_WIRES = ['w-P0.21-SDA', 'w-P0.27-SCL'];

const PANEL = { x: -453, y: 10, w: 431, h: 218 };
// Beside the sensor's lens.
const SPOT = { x: 32, y: -104 };

const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('mlx-read-n', PANEL, { note: '115200', cableTo: USB.nrf52840, wrap: true, fontSize: 32 })}
      <div style="position:absolute;left:${SPOT.x}px;top:${SPOT.y}px">${mug('mrn-hot')}${mug('mrn-ice', { kind: 'ice' })}</div>`,
    bounds: [PANEL.x, Math.min(PANEL.y, SPOT.y - 24), SPOT.x + 46, PANEL.y + PANEL.h],
  },
  activity: [{ wires: I2C_WIRES, at: READS }],
  run(t, view) {
    runMug(view, 'mrn-hot', t, { away: away(t, false) });
    runMug(view, 'mrn-ice', t, { away: away(t, true) });
    showSerial(view, 'mlx-read-n', t, PRINTS);
  },
};

export default cell;

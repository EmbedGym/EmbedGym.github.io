import type { Cell } from '../../cell';
import { mug, runMug } from '../../decor/mug';
import { USB, serialPanel, showSerial } from '../../kit';
import { DURATION, away, printsFor } from '../mega/mlx90614_read_temperatures';

// The ESP-IDF build prints the Mega sketch's lines (printf "%.2f"), 115200 baud. It reads at once,
// then every second (vTaskDelayUntil).
const READS = [0, 1000, 2000, 3000, 4000, 5000];
const PRINTS = printsFor(READS);
const I2C_WIRES = ['w-38-SDA', 'w-39-SCL'];

const PANEL = { x: -361, y: 380, w: 850, h: 160 };
// Beside the sensor's lens.
const SPOT = { x: 198, y: -28 };

const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('mlx-read-e', PANEL, { note: '115200', cableTo: USB.esp32s3, fontSize: 42 })}
      <div style="position:absolute;left:${SPOT.x}px;top:${SPOT.y}px">${mug('mre-hot')}${mug('mre-ice', { kind: 'ice' })}</div>`,
    bounds: [PANEL.x, SPOT.y - 24, PANEL.x + PANEL.w, PANEL.y + PANEL.h],
  },
  activity: [{ wires: I2C_WIRES, at: READS }],
  run(t, view) {
    runMug(view, 'mre-hot', t, { away: away(t, false) });
    runMug(view, 'mre-ice', t, { away: away(t, true) });
    showSerial(view, 'mlx-read-e', t, PRINTS);
  },
};

export default cell;

import type { Cell } from '../../cell';
import { mug, runMug } from '../../decor/mug';
import { USB, serialPanel, showSerial } from '../../kit';
import { DURATION, mugAway, printsFor } from '../mega/mlx90614_hot_object_monitor';

// The ESP-IDF build prints the Mega sketch's lines (printf "%.1f"), 115200 baud, HOT from 30 °C.
// Its first reading is 250 ms after boot, then one every second.
const READS = [250, 1250, 2250, 3250, 4250, 5250];
const PRINTS = printsFor(READS);
const I2C_WIRES = ['w-38-SDA', 'w-39-SCL'];

const PANEL = { x: -436, y: 380, w: 1000, h: 160 };
// Beside the sensor, above the board.
const SPOT = { x: 198, y: -28 };

const mlx90614HotObjectMonitorEsp32s3: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('mlx-hot-e', PANEL, { note: '115200', cableTo: USB.esp32s3, fontSize: 42 })}
      <div style="position:absolute;left:${SPOT.x}px;top:${SPOT.y}px">${mug('mhe')}</div>`,
    bounds: [PANEL.x, SPOT.y - 24, PANEL.x + PANEL.w, PANEL.y + PANEL.h],
  },
  activity: [{ wires: I2C_WIRES, at: READS }],
  run(t, view) {
    runMug(view, 'mhe', t, { away: mugAway(t) });
    showSerial(view, 'mlx-hot-e', t, PRINTS);
  },
};

export default mlx90614HotObjectMonitorEsp32s3;

import type { Cell } from '../../cell';
import { mug, runMug } from '../../decor/mug';
import { USB, serialPanel, showSerial } from '../../kit';
import { DURATION, READS, mugAway, printsFor } from '../mega/mlx90614_hot_object_monitor';

// The Uno runs the Mega sketch unchanged: 115200 baud, a reading every second, HOT from 30 °C.
const BOARD = 'arduino-uno';
const PRINTS = printsFor(READS);
const I2C_WIRES = ['w-SDA', 'w-SCL'];

const PANEL = { x: -264, y: -60, w: 250, h: 248 };
// In front of the sensor's lens, which faces right.
const SPOT = { x: 404, y: 146 };

const mlx90614HotObjectMonitorUno: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('mlx-hot-u', PANEL, { note: '115200', cableTo: USB.uno, wrap: true })}
      <div style="position:absolute;left:${SPOT.x}px;top:${SPOT.y}px">${mug('mhu')}</div>`,
    bounds: [PANEL.x, PANEL.y, SPOT.x + 46, PANEL.y + PANEL.h],
  },
  activity: [{ wires: I2C_WIRES, at: READS }],
  run(t, view) {
    runMug(view, 'mhu', t, { away: mugAway(t) });
    showSerial(view, 'mlx-hot-u', t, PRINTS, { board: BOARD });
  },
};

export default mlx90614HotObjectMonitorUno;

import type { Cell } from '../../cell';
import { mug, runMug } from '../../decor/mug';
import { USB, serialPanel, showSerial } from '../../kit';
import { DURATION, away, printsFor, READS } from '../mega/mlx90614_read_temperatures';

// The Uno runs the Mega sketch unchanged: 115200 baud, a reading every second.
const PRINTS = printsFor(READS);
const I2C_WIRES = ['w-SDA', 'w-SCL'];

const PANEL = { x: -314, y: -30, w: 300, h: 180 };
// Beside the sensor's lens.
const SPOT = { x: 404, y: 146 };

const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('mlx-read-u', PANEL, { note: '115200', cableTo: USB.uno, wrap: true, fontSize: 25 })}
      <div style="position:absolute;left:${SPOT.x}px;top:${SPOT.y}px">${mug('mru-hot')}${mug('mru-ice', { kind: 'ice' })}</div>`,
    bounds: [PANEL.x, Math.min(PANEL.y, SPOT.y - 24), SPOT.x + 46, PANEL.y + PANEL.h],
  },
  activity: [{ wires: I2C_WIRES, at: READS }],
  run(t, view) {
    runMug(view, 'mru-hot', t, { away: away(t, false) });
    runMug(view, 'mru-ice', t, { away: away(t, true) });
    showSerial(view, 'mlx-read-u', t, PRINTS, { board: 'arduino-uno' });
  },
};

export default cell;

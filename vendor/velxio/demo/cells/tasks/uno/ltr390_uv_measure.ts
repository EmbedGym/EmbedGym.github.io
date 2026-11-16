import { clamp, lerp } from '../../anim';
import type { Cell } from '../../cell';
import { cloud, setCloud, setSun, sun } from '../../decor/sky';
import { USB, serialPanel, showSerial } from '../../kit';
import { cover, DURATION, PRINTS, READS } from '../mega/ltr390_uv_measure';

// The Uno reads the LTR390 on A4/A5; the sensor hangs below the board.
const BUS = ['w-A4-SDA', 'w-A5-SCL'];
const BAUD = '9600';
// Two rows: header 34 + 2 x 34 + 10.
const PANEL = { x: -220, y: 55, w: 200, h: 112 };
// Left of the sensor under the board, below the VIN run; the drifting cloud stops short of the sensor.
const SUN = { x: 106, y: 261 };

const ltr390UvMeasureUno: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('out', PANEL, { note: BAUD, cableTo: USB.uno })}
      ${sun('sun', { rays: 'uv' })}
      ${cloud('cloud')}`,
    bounds: [PANEL.x, PANEL.y, SUN.x + 90, SUN.y + 46],
  },
  activity: [{ wires: BUS, at: READS }],
  run(t, view) {
    const c = cover(t);
    setSun(view, 'sun', SUN, { brightness: 1 - 0.85 * c, turn: (t / DURATION) * 45 });
    // The cloud crosses the sun at a steady pace, fading in and out at the ends.
    const drift = clamp((t - 1300) / 2400);
    setCloud(view, 'cloud', { x: lerp(SUN.x - 30, SUN.x + 30, drift), y: SUN.y }, c);
    showSerial(view, 'out', t, PRINTS, { board: 'arduino-uno' });
  },
};

export default ltr390UvMeasureUno;

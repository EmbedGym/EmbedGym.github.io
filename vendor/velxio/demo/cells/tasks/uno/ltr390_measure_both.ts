import { clamp, lerp } from '../../anim';
import type { Cell } from '../../cell';
import { cloud, setCloud, setSun, sun } from '../../decor/sky';
import { USB, serialPanel, showSerial } from '../../kit';
import { CONVERSION, cover, DURATION, modePanel, PRINTS, READS, showMode } from '../mega/ltr390_measure_both';

// The Uno reads the LTR390 on A4/A5; the sensor hangs below the board.
const BUS = ['w-A4-SDA', 'w-A5-SCL'];
const BAUD = '9600';
const FONT = 25;
// Two rows: header 34 + 2 x 34 + 10.
const PANEL = { x: -330, y: 2, w: 310, h: 112 };
// Left of the sensor under the board, below the VIN run; the drifting cloud stops short of the sensor.
const SUN = { x: 106, y: 261 };
const MODE = modePanel('c-ltbu', { x: -150, y: 130 }, FONT);

const ltr390MeasureBothUno: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('out', PANEL, { note: BAUD, cableTo: USB.uno, fontSize: FONT })}
      ${sun('sun', { rays: 'both' })}
      ${cloud('cloud')}
      ${MODE.html}`,
    bounds: [PANEL.x, PANEL.y, SUN.x + 90, SUN.y + 46],
  },
  // Each pass switches to UVS, reads it and switches to ALS, then reads ALS.
  activity: [{ wires: BUS, at: READS.flatMap((r) => [r - 2 * CONVERSION, r - CONVERSION, r]) }],
  run(t, view) {
    const c = cover(t);
    // Alternating rays repeat every 90°, so a quarter turn a loop keeps the seam still.
    setSun(view, 'sun', SUN, { brightness: 1 - 0.85 * c, turn: (t / DURATION) * 90 });
    // The cloud crosses the sun at a steady pace, fading in and out at the ends.
    const drift = clamp((t - 1700) / 2800);
    setCloud(view, 'cloud', { x: lerp(SUN.x - 30, SUN.x + 30, drift), y: SUN.y }, c);
    showMode(view, t);
    showSerial(view, 'out', t, PRINTS, { board: 'arduino-uno' });
  },
};

export default ltr390MeasureBothUno;

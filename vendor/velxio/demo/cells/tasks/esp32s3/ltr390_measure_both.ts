import { clamp, lerp } from '../../anim';
import type { Cell } from '../../cell';
import { cloud, setCloud, setSun, sun } from '../../decor/sky';
import { USB, serialPanel, showSerial } from '../../kit';
import { CONVERSION, cover, DURATION, modePanel, PRINTS, READS, showMode } from '../mega/ltr390_measure_both';

// The ESP32-S3 reads the LTR390 on GPIO38/39; the sensor sits right of the board.
const BUS = ['w-38-SDA', 'w-39-SCL'];
const BAUD = '115200';
// The card is tall (I2C at the board's top, the console socket at its bottom), so the text is larger.
const FONT = 34;
// Left of the board's bottom end, its top below the console socket so the cable can turn up into it. One row: header 34 + 46 + 10.
const PANEL = { x: -464, y: 358, w: 444, h: 90 };
// Right of the sensor, far enough that the drifting cloud clears it.
const SUN = { x: 340, y: 138 };
const MODE = modePanel('c-ltbe', { x: 270, y: 215 }, FONT);

const ltr390MeasureBothEsp32s3: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('out', PANEL, { note: BAUD, cableTo: USB.esp32s3, fontSize: FONT })}
      ${sun('sun', { rays: 'both' })}
      ${cloud('cloud')}
      ${MODE.html}`,
    bounds: [PANEL.x, PANEL.y, SUN.x + 90, PANEL.y + PANEL.h],
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
    showSerial(view, 'out', t, PRINTS);
  },
};

export default ltr390MeasureBothEsp32s3;

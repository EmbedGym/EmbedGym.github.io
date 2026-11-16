import { clamp, lerp } from '../../anim';
import type { Cell } from '../../cell';
import { cloud, setCloud, setSun, sun } from '../../decor/sky';
import { USB, serialPanel, showSerial } from '../../kit';
import { CONVERSION, cover, DURATION, modePanel, PRINTS, READS, showMode } from '../mega/ltr390_measure_both';

// The nRF52840 DK reads the LTR390 on P0.21/P0.27; the sensor sits above the top row's left end.
const BUS = ['w-P0.21-SDA', 'w-P0.27-SCL'];
const BAUD = '115200';
const FONT = 27;
// Two readings, unwrapped: header 34 + 2 x 36.7 + 10.
const PANEL = { x: -400, y: 10, w: 380, h: 118 };
// Left of the sensor, above the serial panel.
const SUN = { x: -125, y: -60 };
const MODE_AT = { x: -150, y: 136 };
const MODE = modePanel('c-ltbn', MODE_AT, FONT);

const ltr390MeasureBothNrf52840: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('out', PANEL, { note: BAUD, cableTo: USB.nrf52840, fontSize: FONT })}
      ${sun('sun', { rays: 'both' })}
      ${cloud('cloud')}
      ${MODE.html}`,
    bounds: [PANEL.x, SUN.y - 46, SUN.x + 90, MODE_AT.y + MODE.h],
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

export default ltr390MeasureBothNrf52840;

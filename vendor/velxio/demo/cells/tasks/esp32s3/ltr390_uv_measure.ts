import { clamp, lerp } from '../../anim';
import type { Cell } from '../../cell';
import { cloud, setCloud, setSun, sun } from '../../decor/sky';
import { USB, serialPanel, showSerial } from '../../kit';
import { cover, DURATION, PRINTS, READS } from '../mega/ltr390_uv_measure';

// The ESP32-S3 reads the LTR390 on GPIO38/39; the sensor sits right of the board.
const BUS = ['w-38-SDA', 'w-39-SCL'];
const BAUD = '115200';
// Left of the board, ending above the console socket: the cable leaves its bottom and comes up
// into the socket from below. One row: header 34 + 46 + 10.
const FONT = 34;
const PANEL = { x: -250, y: 210, w: 240, h: 90 };
// The cable's run under the plug (kit.ts: 20 px below the socket's 362).
const CABLE_BOTTOM = 384;
// Right of the sensor, far enough that the drifting cloud clears it.
const SUN = { x: 340, y: 138 };

const ltr390UvMeasureEsp32s3: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('out', PANEL, { note: BAUD, cableTo: USB.esp32s3, fontSize: FONT })}
      ${sun('sun', { rays: 'uv' })}
      ${cloud('cloud')}`,
    bounds: [PANEL.x, PANEL.y, SUN.x + 90, CABLE_BOTTOM],
  },
  activity: [{ wires: BUS, at: READS }],
  run(t, view) {
    const c = cover(t);
    setSun(view, 'sun', SUN, { brightness: 1 - 0.85 * c, turn: (t / DURATION) * 45 });
    // The cloud crosses the sun at a steady pace, fading in and out at the ends.
    const drift = clamp((t - 1300) / 2400);
    setCloud(view, 'cloud', { x: lerp(SUN.x - 30, SUN.x + 30, drift), y: SUN.y }, c);
    showSerial(view, 'out', t, PRINTS);
  },
};

export default ltr390UvMeasureEsp32s3;

import { clamp, lerp } from '../../anim';
import type { Cell } from '../../cell';
import { cloud, setCloud, setSun, sun } from '../../decor/sky';
import { USB, serialPanel, showSerial } from '../../kit';
import { cover, DURATION, PRINTS, READS } from '../mega/ltr390_light_measure';

// The ESP32-S3 reads the LTR390 on GPIO38/39; the sensor sits right of the board.
const BUS = ['w-38-SDA', 'w-39-SCL'];
const BAUD = '115200';
// Left of the board's bottom end, its top below the console socket so the cable can turn up into it.
// One row (header 34 + 46 + 10) keeps the card short enough for scale ~0.57; 34 px text stays 18+ on the card.
const FONT = 34;
const PANEL = { x: -250, y: 358, w: 240, h: 90 };
// Right of the sensor, far enough that the drifting cloud clears it.
const SUN = { x: 340, y: 138 };

const ltr390LightMeasureEsp32s3: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('out', PANEL, { note: BAUD, cableTo: USB.esp32s3, fontSize: FONT })}
      ${sun('sun')}
      ${cloud('cloud')}`,
    bounds: [PANEL.x, PANEL.y, SUN.x + 90, PANEL.y + PANEL.h],
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

export default ltr390LightMeasureEsp32s3;

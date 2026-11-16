import { clamp, lerp } from '../../anim';
import type { Cell } from '../../cell';
import { cloud, setCloud, setSun, sun } from '../../decor/sky';
import { USB, serialPanel, showSerial } from '../../kit';
import { cover, DURATION, PRINTS, READS } from '../mega/ltr390_uv_measure';

// The nRF52840 DK reads the LTR390 on P0.21/P0.27; the sensor sits above the board.
const BUS = ['w-P0.21-SDA', 'w-P0.27-SCL'];
const BAUD = '115200';
// Left of the VDD trunk, level with the socket: header 34 + 2 x 35.4 + 10.
const FONT = 26;
const PANEL = { x: -258, y: 10, w: 230, h: 115 };
// Left of the sensor, above the panel; the drifting cloud stops short of the VDD trunk.
const SUN = { x: -125, y: -60 };

const ltr390UvMeasureNrf52840: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('out', PANEL, { note: BAUD, cableTo: USB.nrf52840, fontSize: FONT })}
      ${sun('sun', { rays: 'uv' })}
      ${cloud('cloud')}`,
    bounds: [PANEL.x, SUN.y - 46, SUN.x + 90, PANEL.y + PANEL.h],
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

export default ltr390UvMeasureNrf52840;

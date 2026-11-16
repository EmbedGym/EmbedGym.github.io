import { easeInOutCubic, lerp, progress } from '../../anim';
import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial, type Print, type UsbPort } from '../../kit';
import { decorBounds } from './sen0244_tds_read';
import { runSalt, setWater, waterGlass } from '../../decor/water';

// Clean water round the probe gets a pinch of salt three times, turning
// Excellent → Good → Fair → Poor; then the glass is emptied and refilled with
// clean water. Each second the sketch prints the median of its last 30 A0
// samples (40 ms apart), so a change shows once it fills over half the window.
const DURATION = 6000;
const DRAIN: [number, number] = [3600, 3900];
const FILL: [number, number] = [4600, 4900];
const SALT = [700, 1700, 2700];

const classAt = (t: number) => (t >= FILL[0] ? 0 : SALT.filter((s) => t >= s).length);
const QUALITY = ['Excellent', 'Good', 'Fair', 'Poor'];
type Point = { x: number; y: number };

export interface WaterQualityLayout {
  /** The board id and console socket. */
  board: string;
  usb: UsbPort;
  serial: { x: number; y: number; w: number; h: number };
  font: number;
  /** The cup's top-left: the probe's prongs sit 6..30 px below its top. */
  glass: Point;
  /** The board-to-signal wire, which glows while the probe is wet. */
  signalWire: string;
  /** The printed ppm for each class's water (set tds = 80, 200, 350, 600), by the board's own ADC rounding. */
  ppm: number[];
}

// The library cup is 52 x 52; the water's surface runs from 40 px below the
// cup's top (dry) to 6 px (wet). The water muddies with each class.
export function waterQualityCell(o: WaterQualityLayout): Cell {
  const dryTop = o.glass.y + 40;
  const wetTop = o.glass.y + 6;
  const waterTop = (t: number) => {
    if (t < DRAIN[0]) return wetTop;
    if (t < DRAIN[1]) return lerp(wetTop, dryTop, easeInOutCubic(progress(t, DRAIN[0], DRAIN[1] - DRAIN[0])));
    if (t < FILL[0]) return dryTop;
    if (t < FILL[1]) return lerp(dryTop, wetTop, easeInOutCubic(progress(t, FILL[0], FILL[1] - FILL[0])));
    return wetTop;
  };
  const line = (i: number) => `TDS: ${o.ppm[i]} ppm Quality: ${QUALITY[i]}`;
  const loopPrints: Print[] = [
    ...[0, 1, 2, 3].map((i) => ({ t: 500 + 1000 * i, text: line(i) })),
    { t: 4500, text: 'No water detected' },
    { t: 5500, text: line(0) },
  ];
  // The previous loop's lines are on screen at t=0, matching the end state.
  const prints: Print[] = [...loopPrints.map((p) => ({ ...p, t: p.t - DURATION })), ...loopPrints];
  return {
    duration: DURATION,
    decor: {
      html: `
      ${serialPanel('out', o.serial, { note: '115200', cableTo: o.usb, fontSize: o.font })}
      ${waterGlass('glass', o.glass.x, o.glass.y, { salt: true })}`,
      bounds: decorBounds(o.serial, o.glass, o.usb),
    },
    run(t, view) {
      const top = waterTop(t);
      const level = (o.glass.y + 52 - top) / 52;
      setWater(view, 'glass', level, classAt(t) / 3);
      runSalt(view, 'glass', t, SALT, level);

      view.glowWire(o.signalWire, top < wetTop + 12 ? 0.5 : 0);
      showSerial(view, 'out', t, prints, { board: o.board });
    },
  };
}

// Values from a real run (set tds = 80, 200, 350, 600).
export default waterQualityCell({
  board: 'arduino-mega',
  usb: USB.mega,
  serial: { x: -508, y: USB.mega.y - 66, w: 486, h: 112 },
  font: 24,
  glass: { x: -78, y: 274.1 },
  signalWire: 'w-A0-signal',
  ppm: [88, 219, 389, 692],
});

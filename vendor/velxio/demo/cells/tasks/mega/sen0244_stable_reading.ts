import { easeInOutCubic, lerp, progress } from '../../anim';
import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial, type Print, type UsbPort } from '../../kit';
import { decorBounds } from './sen0244_tds_read';
import { setWater, waterGlass } from '../../decor/water';

// A glass of 300 ppm water rises round the probe tip and drains just before
// the loop ends. Each second the sketch takes the median of its last 30 A0
// samples (40 ms apart): dry prints "No water detected" and clears the
// history; wet prints "Settling" until five readings agree, then "Stable".
const DURATION = 6000;
const FILL: [number, number] = [700, 1100];
const DRAIN: [number, number] = [5600, 5900];

type Point = { x: number; y: number };

export interface StableReadingLayout {
  /** The board id and console socket. */
  board: string;
  usb: UsbPort;
  serial: { x: number; y: number; w: number; h: number };
  font: number;
  /** The cup's top-left: the probe's prongs sit 6..30 px below its top. */
  glass: Point;
  /** The board-to-signal wire, which glows while the probe is wet. */
  signalWire: string;
  /** The printed ppm for 300 ppm water (the board's own ADC rounding). */
  ppm: number;
  /** When the glass fills, ms; the first wet print needs over half the 30-sample window wet. */
  fill?: [number, number];
}

// The library cup is 52 x 52; the water's surface runs from 40 px below the
// cup's top (dry) to 6 px (wet), and the prongs read wet past 18 px.
export function stableReadingCell(o: StableReadingLayout): Cell {
  const dryTop = o.glass.y + 40;
  const wetTop = o.glass.y + 6;
  const prongMid = o.glass.y + 18;
  const fill = o.fill ?? FILL;
  const waterTop = (t: number) => {
    if (t < fill[0]) return dryTop;
    if (t < fill[1]) return lerp(dryTop, wetTop, easeInOutCubic(progress(t, fill[0], fill[1] - fill[0])));
    if (t < DRAIN[0]) return wetTop;
    if (t < DRAIN[1]) return lerp(wetTop, dryTop, easeInOutCubic(progress(t, DRAIN[0], DRAIN[1] - DRAIN[0])));
    return dryTop;
  };
  // The median needs about 15 wet samples, so the first wet second already
  // counts, and the fifth is "Stable".
  const loopPrints: Print[] = [
    { t: 500, text: 'No water detected' },
    ...[1500, 2500, 3500, 4500].map((t) => ({ t, text: `Settling: ${o.ppm} ppm` })),
    { t: 5500, text: `Stable: ${o.ppm} ppm` },
  ];
  // The previous loop's lines are on screen at t=0, matching the end state.
  const prints: Print[] = [...loopPrints.map((p) => ({ ...p, t: p.t - DURATION })), ...loopPrints];
  return {
    duration: DURATION,
    decor: {
      html: `
      ${serialPanel('out', o.serial, { note: '115200', cableTo: o.usb, fontSize: o.font })}
      ${waterGlass('glass', o.glass.x, o.glass.y)}`,
      bounds: decorBounds(o.serial, o.glass, o.usb),
    },
    run(t, view) {
      const top = waterTop(t);
      setWater(view, 'glass', (o.glass.y + 52 - top) / 52);
      view.glowWire(o.signalWire, top < prongMid ? 0.5 : 0);
      showSerial(view, 'out', t, prints, { board: o.board });
    },
  };
}

// Prints from a real run (set tds = 300).
export default stableReadingCell({
  board: 'arduino-mega',
  usb: USB.mega,
  serial: { x: -322, y: USB.mega.y - 66, w: 300, h: 112 },
  font: 24,
  glass: { x: -78, y: 274.1 },
  signalWire: 'w-A0-signal',
  ppm: 299,
});

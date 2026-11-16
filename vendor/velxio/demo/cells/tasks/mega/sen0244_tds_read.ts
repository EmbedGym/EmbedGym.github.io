import { easeInOutCubic, lerp, progress } from '../../anim';
import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial, type Print, type UsbPort } from '../../kit';
import { setWater, waterGlass } from '../../decor/water';

// A glass of tap water (about 250 ppm) rises round the probe tip and drains
// again. The sketch reads A0 once a second and prints voltage and TDS; a dry
// probe reads 0 V.
const DURATION = 6000;
const FILL: [number, number] = [800, 1400];
const DRAIN: [number, number] = [3700, 4300];

type Point = { x: number; y: number };
type Rect = { x: number; y: number; w: number; h: number };

/**
 * The serial panel, its cable and the 52 x 52 cup. A cable to a down-facing
 * socket from a panel ending above the plug loops 20 px under the panel's
 * bottom or the plug, whichever is lower (see serialPanel).
 */
export function decorBounds(serial: Rect, glass: { x: number; y: number }, usb: UsbPort): [number, number, number, number] {
  const cableBottom = usb.opens === 'down' ? Math.max(serial.y + serial.h, usb.y + 12) + 20 + 2 : -Infinity;
  return [
    Math.min(serial.x, glass.x),
    Math.min(serial.y, glass.y),
    Math.max(serial.x + serial.w, glass.x + 52 + 2),
    Math.max(serial.y + serial.h, glass.y + 52 + 2, cableBottom),
  ];
}

export interface TdsReadLayout {
  /** The board id and console socket. */
  board: string;
  usb: UsbPort;
  serial: { x: number; y: number; w: number; h: number };
  font: number;
  /** The cup's top-left: the probe's prongs sit 6..30 px below its top. */
  glass: Point;
  /** The board-to-signal wire, which glows while the probe is wet. */
  signalWire: string;
  /** The line printed while wet (the board's own ADC rounding). */
  wet: string;
}

// The library cup is 52 x 52; the water's surface runs from 40 px below the
// cup's top (dry) to 6 px (wet), and the prongs read wet past 18 px.
export function tdsReadCell(o: TdsReadLayout): Cell {
  const dryTop = o.glass.y + 40;
  const wetTop = o.glass.y + 6;
  const prongMid = o.glass.y + 18;
  const waterTop = (t: number) => {
    if (t < FILL[0]) return dryTop;
    if (t < FILL[1]) return lerp(dryTop, wetTop, easeInOutCubic(progress(t, FILL[0], FILL[1] - FILL[0])));
    if (t < DRAIN[0]) return wetTop;
    if (t < DRAIN[1]) return lerp(wetTop, dryTop, easeInOutCubic(progress(t, DRAIN[0], DRAIN[1] - DRAIN[0])));
    return dryTop;
  };
  const reading = (t: number) => (waterTop(t) < prongMid ? o.wet : 'Voltage: 0.00 V TDS: 0 ppm');
  const loopPrints: Print[] = [500, 1500, 2500, 3500, 4500, 5500].map((t) => ({ t, text: reading(t) }));
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

// The probe's two prongs span cell y 250..262; the glass hangs round them.
export default tdsReadCell({
  board: 'arduino-mega',
  usb: USB.mega,
  serial: { x: -430, y: USB.mega.y - 39, w: 408, h: 78 },
  font: 22,
  glass: { x: -78, y: 274.1 },
  signalWire: 'w-A0-signal',
  wet: 'Voltage: 0.67 V TDS: 249 ppm',
});

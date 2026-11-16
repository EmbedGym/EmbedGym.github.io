import { easeInOutCubic, lerp, progress } from '../../anim';
import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial, type Print, type UsbPort } from '../../kit';
import { decorBounds } from './sen0244_tds_read';
import { runSalt, setWater, waterGlass } from '../../decor/water';

type Led = HTMLElement & { value: boolean };

// Clean water round the probe gets a pinch of salt three times, turning
// Excellent → Good → Fair → Poor; then the glass is emptied and refilled with
// clean water. Each second the sketch reads A0 once, prints the class and sets
// the LED on pin 12: steady for Excellent, toggling every 500/125/50 ms for
// Good/Fair/Poor, off when dry.
const DURATION = 6000;
const DRAIN: [number, number] = [3600, 3900];
const FILL: [number, number] = [4600, 4900];
const SALT = [700, 1700, 2700];

const classAt = (t: number) => (t >= FILL[0] ? 0 : SALT.filter((s) => t >= s).length);
const QUALITY = ['Excellent', 'Good', 'Fair', 'Poor'];

// Readings at 500 + 1000k: Excellent, Good, Fair, Poor, dry, Excellent. The
// LED toggles each half period from the reading that set the class.
function ledOn(t: number, blinkStartsOn: boolean) {
  const blink = (start: number, half: number) => (Math.floor((t - start) / half) % 2 === 0) === blinkStartsOn;
  if (t < 1500) return true;
  if (t < 2500) return blink(1500, 500);
  if (t < 3500) return blink(2500, 125);
  if (t < 4500) return blink(3500, 50);
  return t >= 5500;
}

type Point = { x: number; y: number };

export interface QualityLedLayout {
  /** The board id and console socket. */
  board: string;
  usb: UsbPort;
  serial: { x: number; y: number; w: number; h: number };
  font: number;
  /** The cup's top-left: the probe's prongs sit 9..33 px below its top. */
  glass: Point;
  /** The board-to-signal wire, which glows while the probe is wet, and the LED's drive wires. */
  signalWire: string;
  ledWires: string[];
  /** The printed ppm for each class's water (set tds = 80, 220, 400, 700), by the board's own ADC rounding. */
  ppm: number[];
  /**
   * Entering a blinking class the AVR sketch's long-idle toggle timer fires at
   * once, so the LED first goes off; the ESP-IDF and Zephyr sketches start it on.
   */
  blinkStartsOn: boolean;
}

// The library cup is 52 x 52; the water's surface runs from 42 px below the
// cup's top (dry) to 9 px (wet). The water muddies with each class.
export function qualityLedCell(o: QualityLedLayout): Cell {
  const dryTop = o.glass.y + 42;
  const wetTop = o.glass.y + 9;
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
      const on = ledOn(t, o.blinkStartsOn);
      view.part<Led>('L1').value = on;
      if (on) for (const id of o.ledWires) view.glowWire(id, 1);
      showSerial(view, 'out', t, prints, { board: o.board });
    },
  };
}

// Values from a real run (set tds = 80, 220, 400, 700).
export default qualityLedCell({
  board: 'arduino-mega',
  usb: USB.mega,
  serial: { x: -577, y: USB.mega.y - 108, w: 555, h: 121 },
  font: 28,
  glass: { x: -114, y: 274.1 },
  signalWire: 'w-A0-signal',
  ledWires: ['w-12-R_LED', 'w-R_LED-L1'],
  ppm: [79, 219, 399, 698],
  blinkStartsOn: false,
});

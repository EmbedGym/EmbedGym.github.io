import { clamp, easeInOutCubic, lerp } from '../../anim';
import type { Cell, Rect } from '../../cell';
import { USB, serialPanel, showSerial, type Print, type UsbPort } from '../../kit';
import { pirWaves, runPirWaves, setWalker, strideAt, walker } from '../../decor/walker';

// A person walks up to the PIR and stops. The PIR holds OUT HIGH for 3 s after the
// motion; the sketch prints on each change of OUT.
const DURATION = 5000;
const WALK_END = 1000;
const TRIGGER = 400;
const HOLD = 3000;
const FADE_OUT = 4400;

const MAN_SCALE = 100 / 120;
const MAN_H = 120 * MAN_SCALE;

// "Motion Detected!\r\n" takes ~19 ms at 9600 baud.
const PRINTS: Print[] = [
  { t: TRIGGER + 19, text: 'Motion Detected!' },
  { t: TRIGGER + HOLD + 21, text: 'No Motion Detected!' },
];

/** What differs between boards: names, the serial panel and where the person walks. */
export interface PirMotionBoard {
  /** The wire from OUT to the board, which glows while OUT is HIGH. */
  out: string;
  /** The board element, for its TX LED; omitted where the board draws none. */
  txLed?: string;
  usb: UsbPort;
  panel: Rect;
  baud: string;
  /** Serial text size, px (default 25). */
  font?: number;
  /** The person's feet walk from x `from` to x `to` at height `feet`, toward the PIR's side they start on. */
  walk: { from: number; to: number; feet: number };
}

export function pirMotionCell(b: PirMotionBoard): Cell {
  const { from, to, feet } = b.walk;
  const fromRight = from > to;
  return {
    duration: DURATION,
    decor: {
      html: `
        ${serialPanel('out', b.panel, { note: b.baud, cableTo: b.usb, fontSize: b.font })}
        ${walker('man', MAN_SCALE)}${pirWaves('motion')}`,
      bounds: [
        Math.min(b.panel.x, Math.min(from, to) - 30),
        Math.min(b.panel.y, feet - MAN_H),
        Math.max(b.panel.x + b.panel.w, Math.max(from, to) + 30),
        Math.max(feet, b.panel.y + b.panel.h),
      ],
    },
    run(t, view) {
      const x = lerp(from, to, easeInOutCubic(clamp(t / WALK_END)));
      const walking = t < WALK_END;
      const fadeIn = clamp(t / 250);
      // Legs and arms swing while walking and settle once the person stops.
      const swing = walking ? strideAt(t) * Math.sin(Math.PI * clamp(t / WALK_END)) : 0;
      setWalker(view, 'man', x, feet, swing, MAN_SCALE, Math.min(fadeIn, 1 - clamp((t - FADE_OUT) / 400)));

      if (t >= TRIGGER && t < TRIGGER + HOLD) view.glowWire(b.out, 1);

      // Motion waves travel from the walker toward the PIR.
      const pir = view.box('PIR');
      const domeY = pir.y + pir.h / 2;
      const waveFrom = fromRight ? x - 24 : x + 24;
      const waveTo = fromRight ? pir.x + pir.w + 12 : pir.x - 12;
      runPirWaves(view, 'motion', t, waveFrom, waveTo, domeY, walking ? fadeIn : 0);

      showSerial(view, 'out', t, PRINTS, { board: b.txLed, fadeFrom: FADE_OUT });
    },
  };
}

// The person walks in from the right toward the PIR, above its GND run.
export default pirMotionCell({
  out: 'w-PIR-OUT',
  txLed: 'arduino-mega',
  usb: USB.mega,
  panel: { x: -338, y: USB.mega.y - 56, w: 318, h: 112 },
  baud: '9600',
  walk: { from: 380, to: 345, feet: -40 },
});

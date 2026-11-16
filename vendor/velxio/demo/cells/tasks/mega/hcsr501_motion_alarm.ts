import { clamp, easeInOutCubic, lerp } from '../../anim';
import type { Cell, Rect } from '../../cell';
import { setSound, sound, type SoundDir } from '../../decor/sound';
import { pirWaves, runPirWaves, setWalker, strideAt, walker } from '../../decor/walker';

type Buzzer = HTMLElement & { hasSignal: boolean };

// A person walks up to the PIR and stops. The PIR holds OUT HIGH for 3 s after the
// motion, and the sketch sounds a 2 kHz tone on the buzzer while OUT is HIGH.
const DURATION = 5000;
const WALK_END = 1100;
const TRIGGER = 500;
const HOLD = 3000;
const FADE_OUT = 4500;

const MAN_H = 120;

/** What differs between boards: wire ids, where the person walks and where the tag goes. */
export interface PirBoard {
  /** Class prefix, unique per board's card. */
  prefix: string;
  /** The PIR's OUT and the buzzer's signal wires, which glow while OUT is HIGH. */
  high: string[];
  /** The person's feet walk from x `from` to x `to` at height `feet`, toward the PIR's side they start on. */
  walk: { from: number; to: number; feet: number };
  /** A tag showing OUT and the time left on the hold. */
  tag: Rect;
  /** Tag text size, px (default 22). */
  font?: number;
  /** Which way the buzzer's rings travel (default up). */
  soundDir?: SoundDir;
}

export function pirAlarmCell(b: PirBoard): Cell {
  const pa = b.prefix;
  const font = b.font ?? 22;
  const { from, to, feet } = b.walk;
  const BAR = { x: 6, y: Math.round(5 + font * 1.6), w: b.tag.w - 14, h: 10 };
  const fromRight = from > to;
  return {
    duration: DURATION,
    decor: {
      html: `
        <style>
          .${pa}tag {
            position: absolute; left: ${b.tag.x}px; top: ${b.tag.y}px; width: ${b.tag.w}px; height: ${b.tag.h}px;
            background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 10px;
            box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
          }
          .${pa}out { position: absolute; left: 0; right: 0; top: 5px; text-align: center; font: 700 ${font}px var(--mono); color: var(--ink); }
          .${pa}track { position: absolute; left: ${BAR.x}px; top: ${BAR.y}px; width: ${BAR.w}px; height: ${BAR.h}px; border-radius: 4px; background: #f1f3f6; border: 1.5px solid #e2e6ec; overflow: hidden; }
          .${pa}fill { height: 100%; background: #0066ff; }
        </style>
        ${walker('man')}
        <div class="${pa}tag">
          <div class="${pa}out"></div>
          <div class="${pa}track"><div class="${pa}fill"></div></div>
        </div>
        ${pirWaves('motion')}${sound('buzz')}`,
      bounds: [
        Math.min(b.tag.x, Math.min(from, to) - 30),
        Math.min(b.tag.y, feet - MAN_H),
        Math.max(b.tag.x + b.tag.w, Math.max(from, to) + 30),
        Math.max(feet, b.tag.y + b.tag.h),
      ],
    },
    run(t, view) {
      const x = lerp(from, to, easeInOutCubic(clamp(t / WALK_END)));
      const walking = t < WALK_END;
      // Legs and arms swing while walking and settle once the person stops.
      const swing = walking ? strideAt(t) * Math.sin(Math.PI * clamp(t / WALK_END)) : 0;
      setWalker(view, 'man', x, feet, swing, 1, Math.min(clamp(t / 250), 1 - clamp((t - FADE_OUT) / 400)));

      const high = t >= TRIGGER && t < TRIGGER + HOLD;
      const out = view.q<HTMLElement>(`.${pa}out`);
      out.textContent = high ? 'HIGH' : 'LOW';
      out.style.color = high ? '#0066ff' : '';
      view.q<HTMLElement>(`.${pa}fill`).style.width = `${high ? 100 * (1 - (t - TRIGGER) / HOLD) : 0}%`;
      view.part<Buzzer>('BZ1').hasSignal = high;
      if (high) for (const w of b.high) view.glowWire(w, 1);

      // Motion waves travel from the walker toward the PIR while the person moves.
      const pir = view.box('PIR');
      const domeY = pir.y + pir.h / 2;
      const waveFrom = fromRight ? x - 36 : x + 36;
      const waveTo = fromRight ? pir.x + pir.w + 19 : pir.x - 19;
      runPirWaves(view, 'motion', t, waveFrom, waveTo, domeY, walking ? clamp(t / 250) : 0);

      const buzzer = view.box('BZ1');
      setSound(view, 'buzz', { x: buzzer.x + buzzer.w / 2, y: buzzer.y + buzzer.w / 2 }, high ? (t - TRIGGER) / 250 : null, { dir: b.soundDir ?? 'up', from: 50, to: 80 });
    },
  };
}

// The person walks in from the right toward the PIR, above the GND run; the tag sits left of the buzzer.
export default pirAlarmCell({
  prefix: 'c-pir-',
  high: ['w-PIR-OUT', 'w-3-BZ'],
  walk: { from: 460, to: 400, feet: -50 },
  tag: { x: 108, y: -118, w: 60, h: 60 },
});

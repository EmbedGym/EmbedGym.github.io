import { clamp, easeOutCubic } from '../../anim';
import type { Cell, Rect } from '../../cell';
import { setSound, sound, type SoundDir } from '../../decor/sound';
import { setTurn, turn } from '../../decor/turn';

type Tilt = HTMLElement & { tilted: boolean };
type Buzzer = HTMLElement & { hasSignal: boolean };

// The module is tipped over and later set upright. Each change of S starts a
// 500 ms 2 kHz burst on the buzzer.
const DURATION = 3000;
const TIP = 500;
const UPRIGHT = 1700;
const BURST = 500;

/** What differs between boards: wire ids and where the arrow and tag go. */
export interface TiltBoard {
  /** Class prefix, unique per board's card. */
  prefix: string;
  /** S to the board, which glows while S is HIGH. */
  s: string;
  /** The buzzer's signal wire, which glows during a burst. */
  buzzer: string;
  /** A turning arrow by the module, showing each tip. */
  arrow: { cx: number; cy: number; r: number };
  /** A tag showing the level on S. */
  tag: Rect;
  /** The level's text size, px (default 24); the "pin S" caption is 3/4 of it. */
  font?: number;
  /** Which way the buzzer's rings travel (default left). */
  soundDir?: SoundDir;
}

export function tiltCell(b: TiltBoard): Cell {
  const tl = b.prefix;
  const font = b.font ?? 24;
  const caption = (font * 3) / 4;
  const { arrow: ARROW, tag: TAG } = b;
  return {
    duration: DURATION,
    decor: {
      html: `
        <style>
          .${tl}tag {
            position: absolute; left: ${TAG.x}px; top: ${TAG.y}px; width: ${TAG.w}px; height: ${TAG.h}px;
            background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 10px;
            box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
            text-align: center; color: var(--ink);
          }
          .${tl}tag .pin { font: 600 ${caption}px/${(caption * 26) / 18}px var(--mono); color: #64748b; }
          .${tl}tag .lvl { font: 700 ${font}px/${(font * 28) / 24}px var(--mono); }
        </style>
        <div class="${tl}tag"><div class="pin">pin S</div><div class="lvl"></div></div>
        ${turn('tip')}${sound('buzz')}`,
      bounds: [
        Math.min(ARROW.cx - ARROW.r - 4, TAG.x),
        Math.min(TAG.y, ARROW.cy - ARROW.r - 4),
        Math.max(TAG.x + TAG.w, ARROW.cx + ARROW.r + 4),
        Math.max(TAG.y + TAG.h, ARROW.cy + ARROW.r + 4),
      ],
    },
    run(t, view) {
      const tilted = t >= TIP && t < UPRIGHT;
      const tilt = view.part<Tilt>('TILT1');
      tilt.tilted = tilted;
      // The capsule's own 120 ms transition is replaced by a frame-driven tip, so every frame shows its angle.
      const capsule = tilt.shadowRoot!.querySelector<SVGGElement>('#capsule')!;
      capsule.style.transition = 'none';
      const angle = 20 * (easeOutCubic(clamp((t - TIP) / 160)) - easeOutCubic(clamp((t - UPRIGHT) / 160)));
      capsule.setAttribute('transform', `rotate(${angle} 32 26)`);
      const tag = view.q<HTMLElement>(`.${tl}tag .lvl`);
      tag.textContent = tilted ? 'HIGH' : 'LOW';
      tag.style.color = tilted ? '#0066ff' : '';
      if (tilted) view.glowWire(b.s, 1);

      // The arrow turns the way the module goes, shown around each change.
      const change = t >= UPRIGHT ? UPRIGHT : t >= TIP ? TIP : -Infinity;
      const sinceChange = t - change;
      const nearest = Math.abs(t - TIP) < Math.abs(t - UPRIGHT) ? TIP : UPRIGHT;
      setTurn(view, 'tip', { x: ARROW.cx, y: ARROW.cy }, nearest === UPRIGHT ? -1 : 1, clamp(1 - Math.abs(t - nearest) / 350), ARROW.r / 20);

      const burst = sinceChange >= 0 && sinceChange < BURST;
      view.part<Buzzer>('BZ1').hasSignal = burst;
      if (burst) view.glowWire(b.buzzer, 1);
      const buzzer = view.box('BZ1');
      const waves = Number.isFinite(change) ? sinceChange / 125 : null;
      setSound(view, 'buzz', { x: buzzer.x + buzzer.w / 2, y: buzzer.y + buzzer.w / 2 }, waves, { dir: b.soundDir ?? 'left', from: 36, to: 70, count: BURST / 125 });
    },
  };
}

// A turning arrow left of the module shows each tip, and a tag right of it shows the level on S.
export default tiltCell({
  prefix: 'c-tilt-',
  s: 'w-14-S',
  buzzer: 'w-13-BZ',
  arrow: { cx: 206, cy: -70, r: 16 },
  tag: { x: 330, y: -104, w: 68, h: 62 },
});

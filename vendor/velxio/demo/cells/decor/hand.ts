import { clamp, easeOutCubic } from '../anim';
import { SKIN, SKIN_EDGE, type DecorSample, type DecorView } from './common';
import { glow } from './glow';

type Point = { x: number; y: number };

/**
 * An open hand, fingers up and thumb to the right (to the left with `mirror`),
 * 72 x 93 px times `scale`. Its palm centre is the element's (0, 0). `warm`
 * puts a body-heat glow behind the palm, for thermal sensors. Hidden until
 * `setHand` places it.
 */
export function hand(key: string, opts: { scale?: number; mirror?: boolean; warm?: boolean } = {}): string {
  const s = 1.5 * (opts.scale ?? 1);
  const warmth = opts.warm ? glow(`hand-${key}`, { tone: 'heat', scale: 0.92 * (opts.scale ?? 1), level: 1 }) : '';
  return `
    <div data-hand="${key}" style="position:absolute;left:0;top:0;opacity:0">
      ${warmth}
      <svg viewBox="-24 0 48 62" width="${48 * s}" height="${62 * s}" style="position:absolute;left:${-24 * s}px;top:${-45 * s}px;overflow:visible;filter:drop-shadow(0 3px 3px rgba(15, 23, 42, 0.25))">
        <g fill="${SKIN}" stroke="${SKIN_EDGE}" stroke-width="1.6"${opts.mirror ? ' transform="scale(-1 1)"' : ''}>
          <rect x="9.5" y="27" width="8.5" height="23" rx="4.25" transform="rotate(34 13.75 48)" />
          <rect x="-14" y="8" width="7" height="30" rx="3.5" />
          <rect x="-7" y="2" width="7" height="36" rx="3.5" />
          <rect x="0" y="4" width="7" height="34" rx="3.5" />
          <rect x="7" y="10" width="7" height="28" rx="3.5" />
          <path d="M -14 30 H 14 V 50 Q 14 60 3 60 H -4 Q -14 60 -14 50 Z" />
        </g>
      </svg>
    </div>`;
}

/**
 * Puts hand `key`'s palm centre on `at`, turned `tilt` degrees clockwise about
 * it, at `opacity` (0 hides it).
 */
export function setHand(view: DecorView, key: string, at: Point, opts: { tilt?: number; opacity?: number } = {}) {
  const el = view.q<HTMLElement>(`[data-hand="${key}"]`);
  el.style.transform = `translate(${at.x}px, ${at.y}px) rotate(${opts.tilt ?? 0}deg)`;
  el.style.opacity = String(opts.opacity ?? 1);
}

// A clap at 600 ms: the hands close in 140 ms, touch for 60 ms and part over 280 ms.
function opening(t: number) {
  const d = t - 600;
  if (d < -140 || d > 340) return 1;
  if (d < 0) return -d / 140;
  return d < 60 ? 0 : easeOutCubic((d - 60) / 280);
}

export const samples: DecorSample[] = [
  {
    name: 'hand: warm, passing',
    w: 200,
    h: 120,
    html: hand('pass', { warm: true }),
    duration: 3000,
    play: (view, t) => {
      const k = t / 3000;
      setHand(view, 'pass', { x: 20 + 160 * k, y: 70 }, { opacity: clamp(Math.min(k, 1 - k) * 8) });
    },
  },
  {
    name: 'hand: clap (mirrored pair)',
    w: 180,
    h: 120,
    html: hand('left') + hand('right', { mirror: true }),
    duration: 1200,
    play: (view, t) => {
      const open = opening(t);
      for (const side of [-1, 1]) {
        setHand(view, side < 0 ? 'left' : 'right', { x: 90 + side * (22 + 16 * open), y: 70 }, { tilt: side * 14 * open });
      }
    },
  },
];

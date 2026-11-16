import { clamp, easeOutCubic, lerp } from '../anim';
import { BOTTLE, BOTTLE_EDGE, INK, MIST, PLASTIC_DARK, PLASTIC_DARK_EDGE, WATER, type DecorSample, type DecorView } from './common';

type Point = { x: number; y: number };

const DROPS = 14;
const SQUEEZE = 200;
const FLIGHT = 1100;

/**
 * A plant mister, 64 x 100 px times `scale`, with its top-left at the element's
 * (0, 0) and its nozzle at (62, 14) times `scale`, pointing right (left with
 * `mirror`, the nozzle then at (2, 14)). Hidden until `runSpray` places it.
 */
export function spray(key: string, opts: { scale?: number; mirror?: boolean } = {}): string {
  const s = opts.scale ?? 1;
  return `
    <div data-spray="${key}" style="position:absolute;left:0;top:0;opacity:0">
      <svg viewBox="0 0 64 100" width="${64 * s}" height="${100 * s}" overflow="visible" style="position:absolute;left:0;top:0">
        <g${opts.mirror ? ' transform="translate(64 0) scale(-1 1)"' : ''}>
          <path d="M 18 8 H 50 L 62 14 L 50 20 H 40 V 34 H 18 Z" fill="${PLASTIC_DARK}" stroke="${PLASTIC_DARK_EDGE}" stroke-width="1.2" stroke-linejoin="round" />
          <path class="d-spray-trigger" d="M 41 20 L 49 21 Q 47 27 49 33 L 44 32 Z" fill="${INK}" stroke="${PLASTIC_DARK_EDGE}" stroke-width="1.2" stroke-linejoin="round" />
          <path d="M 14 34 H 44 Q 50 34 50 42 V 92 Q 50 98 44 98 H 14 Q 8 98 8 92 V 42 Q 8 34 14 34 Z" fill="${BOTTLE}" stroke="${BOTTLE_EDGE}" stroke-width="1.6" />
          <path d="M 9.5 56 H 48.5 V 92 Q 48.5 96.5 44 96.5 H 14 Q 9.5 96.5 9.5 92 Z" fill="${WATER}" />
          ${`<circle cx="62" cy="14" fill="${MIST}" opacity="0" />`.repeat(DROPS)}
        </g>
      </svg>
    </div>`;
}

/**
 * Places mister `key` with its top-left at `at`. It squeezes for 200 ms at each
 * time in `sprays`, and each puff of mist fans out `reach` px from the nozzle
 * over 1.1 s, fading as it settles.
 */
export function runSpray(view: DecorView, key: string, at: Point, t: number, sprays: number[], opts: { reach: number; scale?: number }) {
  const s = opts.scale ?? 1;
  const el = view.q<HTMLElement>(`[data-spray="${key}"]`);
  el.style.transform = `translate(${at.x}px, ${at.y}px)`;
  el.style.opacity = '1';
  const last = sprays.filter((when) => when <= t).pop();
  const since = last === undefined ? Infinity : t - last;
  el.querySelector('.d-spray-trigger')!.setAttribute('transform', since < SQUEEZE ? 'rotate(18 41 20)' : '');
  const reach = opts.reach / s;
  const p = clamp(since / FLIGHT);
  el.querySelectorAll<SVGCircleElement>('circle').forEach((drop, i) => {
    const spread = ((i % 7) - 3) / 3;
    const d = easeOutCubic(p) * reach * (0.55 + (0.45 * ((i * 5) % 7)) / 6);
    drop.setAttribute('cx', String(62 + d));
    drop.setAttribute('cy', String(14 + spread * d * 0.35 + 10 * p * p));
    drop.setAttribute('r', String(lerp(2, 4, p)));
    drop.setAttribute('opacity', p > 0 && p < 1 ? String(0.8 * (1 - p)) : '0');
  });
}

export const samples: DecorSample[] = [
  {
    name: 'spray: mist',
    w: 180,
    h: 110,
    html: spray('right'),
    duration: 2000,
    play: (view, t) => runSpray(view, 'right', { x: 5, y: 5 }, t, [300], { reach: 100 }),
  },
  {
    name: 'spray: mirrored',
    w: 180,
    h: 110,
    html: spray('left', { mirror: true }),
    duration: 2000,
    play: (view, t) => runSpray(view, 'left', { x: 111, y: 5 }, t, [300], { reach: 100 }),
  },
];

import { clamp, easeInOutCubic } from '../anim';
import type { ExtraPart } from '../cell';
import { GREEN, METAL, METAL_EDGE, METAL_LIGHT, RED, WOOD, WOOD_EDGE, type DecorSample, type DecorView } from './common';

/**
 * A solenoid door lock for a relay to switch, as an extra part 120 x 80 times
 * `scale`, with its top-left at (x, y). Pins `A` and `B` stick out of its bottom
 * edge at (60, 80) and (92, 80) times `scale`; wire it in series with a supply
 * between the relay's COM and NO. Locked, its bolt sits out in the door frame on
 * the left and its badge is red; open, the bolt is pulled in and the badge is
 * green. Set it with `setLock`.
 */
export function lockPart(id: string, x: number, y: number, scale = 1): ExtraPart {
  return {
    id,
    x,
    y,
    pins: { A: { x: 60 * scale, y: 80 * scale }, B: { x: 92 * scale, y: 80 * scale } },
    html: lockSvg(id, scale),
  };
}

function lockSvg(id: string, scale: number): string {
  return `
      <svg class="d-lock" data-lock="${id}" viewBox="0 0 120 80" width="${120 * scale}" height="${80 * scale}" overflow="visible">
        <rect x="0" y="6" width="18" height="58" rx="2" fill="${WOOD}" stroke="${WOOD_EDGE}" stroke-width="1.6" />
        <rect x="4" y="24" width="10" height="22" rx="1" fill="#5c4326" />
        <rect class="d-lock-bolt" x="8" y="25" width="40" height="20" rx="3" fill="${METAL}" stroke="${METAL_EDGE}" stroke-width="1.6" />
        <rect x="36" y="0" width="84" height="70" rx="8" fill="${METAL_LIGHT}" stroke="${METAL_EDGE}" stroke-width="1.8" />
        <rect class="d-lock-badge" x="48" y="10" width="60" height="50" rx="7" />
        <path class="d-lock-shackle" d="M 69 36 V 26 A 9 9 0 0 1 87 26 V 36" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" />
        <rect x="64" y="34" width="28" height="20" rx="3" fill="#fff" />
        <path d="M 60 70 V 80 M 92 70 V 80" stroke="${METAL_EDGE}" stroke-width="3" />
      </svg>`;
}

/**
 * Sets lock `id` (from `lockPart`) for this frame: 0 locked, 1 open. Pass a
 * value in between while the bolt moves; the badge turns green past half way.
 */
export function setLock(view: DecorView, id: string, open: number) {
  const svg = view.q<SVGElement>(`[data-lock="${id}"]`);
  const k = easeInOutCubic(clamp(open));
  svg.querySelector('.d-lock-bolt')!.setAttribute('x', String(8 + 30 * k));
  svg.querySelector('.d-lock-badge')!.setAttribute('fill', k < 0.5 ? RED : GREEN);
  // The shackle lifts and swings open with the bolt.
  svg.querySelector('.d-lock-shackle')!.setAttribute('transform', `translate(0 ${-8 * k})`);
}

export const samples: DecorSample[] = [
  {
    name: 'lock: open and shut',
    w: 140,
    h: 100,
    html: `<div style="position:absolute;left:10px;top:10px">${lockSvg('s', 1)}</div>`,
    duration: 2400,
    play: (view, t) => setLock(view, 's', t < 1200 ? clamp((t - 300) / 400) : 1 - clamp((t - 1500) / 400)),
  },
];

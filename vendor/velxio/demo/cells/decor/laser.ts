import { LASER, LASER_GLOW, type DecorSample, type DecorView } from './common';

type Point = { x: number; y: number };

/**
 * A laser beam with a spot where it lands, drawn in the cell's own coordinates
 * (the overlay's origin is the element's (0, 0)). Aim it with `setLaser`.
 */
export function laser(key: string): string {
  return `
    <svg data-laser="${key}" width="1" height="1" overflow="visible" style="position:absolute;left:0;top:0">
      <line class="d-laser-glow" stroke="${LASER_GLOW}" stroke-width="9" stroke-linecap="round" />
      <line class="d-laser-core" stroke="${LASER}" stroke-width="2.5" stroke-linecap="round" />
      <circle class="d-laser-spot" r="5" fill="${LASER}" />
    </svg>`;
}

/**
 * Draws beam `key` from `from` to `to` for this frame. `on` (0..1) fades the
 * whole beam, for a pulse; `spot` (0..1) fades the spot at `to`, for a beam
 * that something blocks before it lands.
 */
export function setLaser(view: DecorView, key: string, from: Point, to: Point, on = 1, spot = 1) {
  const svg = view.q<SVGSVGElement>(`[data-laser="${key}"]`);
  for (const line of svg.querySelectorAll<SVGLineElement>('line')) {
    line.setAttribute('x1', String(from.x));
    line.setAttribute('y1', String(from.y));
    line.setAttribute('x2', String(to.x));
    line.setAttribute('y2', String(to.y));
  }
  const dot = svg.querySelector<SVGCircleElement>('.d-laser-spot')!;
  dot.setAttribute('cx', String(to.x));
  dot.setAttribute('cy', String(to.y));
  dot.setAttribute('opacity', String(spot));
  svg.style.opacity = String(on);
}

export const samples: DecorSample[] = [
  {
    name: 'laser: steady beam',
    w: 80,
    h: 140,
    html: laser('s'),
    play: (view) => setLaser(view, 's', { x: 40, y: 15 }, { x: 40, y: 125 }),
  },
  {
    name: 'laser: pulse',
    w: 80,
    h: 140,
    html: laser('p'),
    duration: 1000,
    play: (view, t) => setLaser(view, 'p', { x: 40, y: 125 }, { x: 40, y: 15 }, t < 400 ? 1 - t / 400 : 0, 0),
  },
];

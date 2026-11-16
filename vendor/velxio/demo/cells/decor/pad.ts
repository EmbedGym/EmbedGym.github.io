import type { ExtraPart } from '../cell';
import { BLUE, COPPER_EDGE, COPPER_LIT, GOLD, type DecorSample, type DecorView } from './common';

const D = 48;
const PIN_AT = {
  right: { x: D, y: D / 2 },
  bottom: { x: D / 2, y: D },
  left: { x: 0, y: D / 2 },
  top: { x: D / 2, y: 0 },
};

/**
 * A round copper touch pad for a capacitive sensor electrode, as an extra part
 * 48 x 48 times `scale` with its top-left at (x, y). Its one pin `e` sits on the
 * rim at the middle of the `pin` side (default right). Light it up while it is
 * touched with `setPad`.
 */
export function padPart(id: string, x: number, y: number, opts: { scale?: number; pin?: keyof typeof PIN_AT } = {}): ExtraPart {
  const scale = opts.scale ?? 1;
  const pin = PIN_AT[opts.pin ?? 'right'];
  return { id, x, y, pins: { e: { x: pin.x * scale, y: pin.y * scale } }, html: padSvg(id, scale) };
}

function padSvg(id: string, scale: number): string {
  return `
    <svg class="d-pad" data-pad="${id}" viewBox="0 0 ${D} ${D}" width="${D * scale}" height="${D * scale}" overflow="visible">
      <circle class="d-pad-halo" cx="${D / 2}" cy="${D / 2}" r="${D / 2 + 5}" fill="none" stroke="${BLUE}" stroke-width="6" opacity="0" />
      <circle class="d-pad-copper" cx="${D / 2}" cy="${D / 2}" r="${D / 2 - 1.5}" fill="${GOLD}" stroke="${COPPER_EDGE}" stroke-width="1.8" />
      <circle cx="${D / 2}" cy="${D / 2}" r="${D / 2 - 8}" fill="none" stroke="${COPPER_EDGE}" stroke-width="1.2" opacity="0.5" />
    </svg>`;
}

/** Sets pad `id` (from `padPart`) for this frame: lit while `touched`. */
export function setPad(view: DecorView, id: string, touched: boolean) {
  const svg = view.q<SVGElement>(`[data-pad="${id}"]`);
  svg.querySelector('.d-pad-copper')!.setAttribute('fill', touched ? COPPER_LIT : GOLD);
  svg.querySelector('.d-pad-halo')!.setAttribute('opacity', touched ? '0.45' : '0');
}

const at = (part: ExtraPart, left: number, top: number) => `<div style="position:absolute;left:${left}px;top:${top}px">${part.html}</div>`;

export const samples: DecorSample[] = [
  {
    name: 'pad: touch',
    w: 190,
    h: 80,
    html: at(padPart('s1', 0, 0), 12, 16) + at(padPart('s2', 0, 0, { scale: 1.17 }), 72, 12) + at(padPart('s3', 0, 0, { scale: 0.92, pin: 'bottom' }), 140, 18),
    duration: 1800,
    play: (view, t) => {
      setPad(view, 's1', t >= 200 && t < 600);
      setPad(view, 's2', t >= 700 && t < 1100);
      setPad(view, 's3', t >= 1200 && t < 1600);
    },
  },
];

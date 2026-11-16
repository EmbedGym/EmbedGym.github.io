import { INK, type DecorSample, type DecorView } from './common';

type Box = { x: number; y: number; w: number; h: number };

/** Which sides of the shaken object get marks. */
export type MotionSides = 'left' | 'right' | 'both';

/** Shake lines: two curved marks each side of something jolted or knocked. Hidden until `setMotion` draws them; coordinates are the cell's. */
export function motion(key: string): string {
  return `
    <svg data-motion="${key}" width="1" height="1" style="position:absolute;left:0;top:0;overflow:visible;pointer-events:none">
      ${`<path fill="none" stroke="${INK}" stroke-linecap="round" opacity="0" />`.repeat(4)}
    </svg>`;
}

/**
 * Draws shake lines `key` beside `box`, the shaken object, starting 12 px
 * (times `scale`) clear of it and centred on its height. `amount` is 0 for none
 * and 1 for a full shake; pass values between to fade in and out.
 */
export function setMotion(view: DecorView, key: string, box: Box, amount: number, opts: { sides?: MotionSides; scale?: number } = {}) {
  const { sides = 'both', scale = 1 } = opts;
  const cy = box.y + box.h / 2;
  view.qa<SVGPathElement>(`[data-motion="${key}"] path`).forEach((mark, k) => {
    const side = k < 2 ? -1 : 1;
    const shown = sides === 'both' || (sides === 'left' && side < 0) || (sides === 'right' && side > 0);
    const j = k % 2;
    const edge = side < 0 ? box.x : box.x + box.w;
    const x = edge + side * scale * (12 + 10 * j);
    const h = scale * (14 + 8 * j);
    const bow = side * scale * (8 + 4 * j);
    mark.setAttribute('d', `M ${x} ${cy - h} Q ${x + bow} ${cy} ${x} ${cy + h}`);
    mark.setAttribute('stroke-width', String(3.5 * scale));
    mark.setAttribute('opacity', String(shown ? 0.9 * amount : 0));
  });
}

const thing = `<div style="position:absolute;left:50px;top:40px;width:60px;height:40px;border-radius:4px;background:#2f6e3a"></div>`;
const BOX = { x: 50, y: 40, w: 60, h: 40 };

const sample = (sides: MotionSides): DecorSample => ({
  name: `motion: ${sides}`,
  w: 160,
  h: 120,
  html: thing + motion('s'),
  duration: 1200,
  play: (view, t) => setMotion(view, 's', BOX, t >= 300 && t < 700 ? 1 : 0, { sides }),
});

export const samples: DecorSample[] = [sample('both'), sample('left'), sample('right')];

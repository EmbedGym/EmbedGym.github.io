import { CARDBOARD, CARDBOARD_EDGE, CARDBOARD_TAPE, WOOD, WOOD_EDGE, type DecorSample, type DecorView } from './common';

export type ObstacleKind = 'box' | 'wall';

const SIZE: Record<ObstacleKind, { w: number; h: number }> = {
  box: { w: 110, h: 40 },
  wall: { w: 170, h: 26 },
};

/** The obstacle's size in px: a box is 110 x 40, a wall 170 x 26, times `scale`. */
export function obstacleSize(kind: ObstacleKind, scale = 1) {
  return { w: SIZE[kind].w * scale, h: SIZE[kind].h * scale };
}

/**
 * Something a distance sensor or a light beam sees: a taped cardboard box or a
 * plank wall, its top-left at the element's (0, 0). Move it with `placeObstacle`.
 */
export function obstacle(key: string, kind: ObstacleKind, scale = 1): string {
  const { w, h } = SIZE[kind];
  let body: string;
  if (kind === 'box') {
    body = `
      <rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="4" fill="${CARDBOARD}" />
      <rect x="${w / 2 - 7}" y="1" width="14" height="${h - 2}" fill="${CARDBOARD_TAPE}" />
      <rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="4" fill="none" stroke="${CARDBOARD_EDGE}" stroke-width="1.8" vector-effect="non-scaling-stroke" />`;
  } else if (kind === 'wall') {
    const seams = Array.from({ length: Math.floor(w / 14) - 1 }, (_, i) => `M ${14 * (i + 1)} 2 V ${h - 2}`).join(' ');
    body = `
      <rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="3" fill="${WOOD}" />
      <path d="${seams}" stroke="${WOOD_EDGE}" stroke-width="1.2" opacity="0.6" />
      <rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="3" fill="none" stroke="${WOOD_EDGE}" stroke-width="1.8" vector-effect="non-scaling-stroke" />`;
  } else {
    throw new Error(`obstacle: unknown kind '${kind}'`);
  }
  return `
    <svg data-obstacle="${key}" viewBox="0 0 ${w} ${h}" width="${w * scale}" height="${h * scale}" style="position:absolute;left:0;top:0">${body}
    </svg>`;
}

/** Moves obstacle `key` so its top-left sits at (x, y). */
export function placeObstacle(view: DecorView, key: string, x: number, y: number) {
  view.q<SVGSVGElement>(`[data-obstacle="${key}"]`).style.transform = `translate(${x}px, ${y}px)`;
}

export const samples: DecorSample[] = [
  {
    name: 'obstacle: box',
    w: 160,
    h: 120,
    html: obstacle('b', 'box'),
    duration: 2000,
    play: (view, t) => placeObstacle(view, 'b', 25, 10 + 60 * (0.5 - 0.5 * Math.cos((2 * Math.PI * t) / 2000))),
  },
  {
    name: 'obstacle: small box',
    w: 80,
    h: 60,
    html: obstacle('sb', 'box', 0.4),
    play: (view) => placeObstacle(view, 'sb', 18, 22),
  },
  {
    name: 'obstacle: wall',
    w: 200,
    h: 60,
    html: obstacle('w', 'wall'),
    play: (view) => placeObstacle(view, 'w', 15, 17),
  },
];

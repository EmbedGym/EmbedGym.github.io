import { BLUE, INK, type DecorSample, type DecorView } from './common';

/**
 * A person, 60 x 120 times `scale`, with the point between their feet at the
 * element's (0, 0). Pose and move them with `setWalker`.
 */
export function walker(key: string, scale = 1): string {
  return `
    <svg data-walker="${key}" viewBox="-30 -120 60 120" width="${60 * scale}" height="${120 * scale}" overflow="visible" style="position:absolute;left:0;top:0">
      <g fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="0" cy="-104" r="12" fill="${INK}" stroke="none" />
        <path d="M 0 -88 L 0 -44" />
        <path class="d-walker-arms" />
        <path class="d-walker-legs" />
      </g>
    </svg>`;
}

/**
 * Stands walker `key` (drawn at `scale`) with their feet at (x, y). `swing`
 * (-1..1) spreads legs and arms mid-stride; 0 stands still. `opacity` fades
 * them in and out.
 */
export function setWalker(view: DecorView, key: string, x: number, y: number, swing: number, scale = 1, opacity = 1) {
  const svg = view.q<SVGSVGElement>(`[data-walker="${key}"]`);
  svg.style.transform = `translate(${x - 30 * scale}px, ${y - 120 * scale}px)`;
  svg.style.opacity = String(opacity);
  svg.querySelector('.d-walker-legs')!.setAttribute('d', `M ${-10 - 12 * swing} 0 L 0 -44 L ${10 + 12 * swing} 0`);
  svg.querySelector('.d-walker-arms')!.setAttribute('d', `M ${-12 - 12 * swing} -52 L 0 -80 L ${12 + 12 * swing} -52`);
}

/** The stride at `t` ms into a walk, for `setWalker`'s `swing`. */
export function strideAt(t: number): number {
  return Math.sin((t / 1000) * 2 * Math.PI * 2.2);
}

/**
 * The motion a PIR sensor sees: two arcs travelling from a moving person toward
 * the sensor, drawn in the cell's own coordinates. Run them with `runPirWaves`.
 */
export function pirWaves(key: string): string {
  return `
    <svg data-pir-waves="${key}" width="1" height="1" overflow="visible" style="position:absolute;left:0;top:0">
      <path fill="none" stroke="${BLUE}" stroke-width="3" stroke-linecap="round" />
      <path fill="none" stroke="${BLUE}" stroke-width="3" stroke-linecap="round" />
    </svg>`;
}

/**
 * Sends waves `key` from x `fromX` to x `toX` at height `y`, bulging toward the
 * sensor. Each arc takes 450 ms; `opacity` 0 hides them (the person has stopped).
 */
export function runPirWaves(view: DecorView, key: string, t: number, fromX: number, toX: number, y: number, opacity = 1) {
  const toward = Math.sign(toX - fromX);
  view.qa<SVGPathElement>(`[data-pir-waves="${key}"] path`).forEach((wave, j) => {
    const phase = (t / 450 + j / 2) % 1;
    const x = fromX + (toX - fromX) * phase;
    wave.setAttribute('d', `M ${x - 6 * toward} ${y - 18} Q ${x + 6 * toward} ${y} ${x - 6 * toward} ${y + 18}`);
    wave.setAttribute('opacity', String(0.9 * Math.sin(Math.PI * phase) * opacity));
  });
}

export const samples: DecorSample[] = [
  {
    name: 'walker: walks in and stops',
    w: 220,
    h: 150,
    html: `<div style="position:absolute;left:8px;top:40px;width:30px;height:40px;border-radius:4px;background:#2d3a7a"></div>${pirWaves('w')}${walker('w')}`,
    duration: 2400,
    play: (view, t) => {
      const walking = t < 1200;
      const x = 190 - 110 * Math.min(1, t / 1200);
      setWalker(view, 'w', x, 140, walking ? strideAt(t) : 0);
      runPirWaves(view, 'w', t, x - 30, 46, 60, walking ? 1 : 0);
    },
  },
  {
    name: 'walker: small, standing',
    w: 80,
    h: 110,
    html: walker('s', 0.8),
    play: (view) => setWalker(view, 's', 40, 104, 0, 0.8),
  },
];

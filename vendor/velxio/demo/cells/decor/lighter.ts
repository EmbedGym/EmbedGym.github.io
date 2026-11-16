import { BLUE, BLUE_EDGE, METAL, METAL_EDGE, RED, RED_EDGE, type DecorSample, type DecorView } from './common';
import { flame, runFlame } from './flame';

export type LighterKind = 'gas' | 'flame';

/**
 * A lighter, 110 long, lying on its side with its nozzle tip at the element's
 * (0, 0), pointing right (`mirror` points it left). A `gas` lighter (blue) only
 * lets gas out, for a gas sensor; a `flame` lighter (red) burns. Its thumb
 * button sits on top; set it with `setLighter`. `flameScale` sizes a flame
 * lighter's flame apart from its body (default `scale`), for a small lighter
 * whose flame must reach a probe.
 */
export function lighter(key: string, opts: { kind?: LighterKind; mirror?: boolean; scale?: number; flameScale?: number } = {}): string {
  const { kind = 'gas', mirror = false, scale = 1, flameScale = scale } = opts;
  const [fill, edge] = kind === 'gas' ? [BLUE, BLUE_EDGE] : [RED, RED_EDGE];
  const tip = kind === 'flame' ? `<div style="position:absolute;left:${mirror ? -4 : 4}px;top:0">${flame(`lighter-${key}`, { dir: mirror ? 'left' : 'right', scale: flameScale })}</div>` : '';
  return `
    <div data-lighter="${key}" style="position:absolute;left:0;top:0">
      <svg width="1" height="1" overflow="visible" style="position:absolute;left:0;top:0">
        <g transform="scale(${mirror ? -scale : scale} ${scale})">
          <rect class="d-lighter-btn" x="-50" y="-23" width="26" height="9" rx="3" fill="${edge}" />
          <rect x="-110" y="-17" width="88" height="34" rx="8" fill="${fill}" stroke="${edge}" stroke-width="1.6" />
          <rect x="-26" y="-12" width="18" height="24" rx="3" fill="${METAL}" stroke="${METAL_EDGE}" stroke-width="1.4" />
          <rect x="-9" y="-4" width="9" height="8" rx="2" fill="${METAL_EDGE}" />
        </g>
      </svg>
      ${tip}
    </div>`;
}

/** Holds lighter `key`'s button down while `on`; a flame lighter then burns. */
export function setLighter(view: DecorView, key: string, t: number, on: boolean) {
  const el = view.q<HTMLElement>(`[data-lighter="${key}"]`);
  el.querySelector('.d-lighter-btn')!.setAttribute('y', on ? '-19' : '-23');
  if (el.querySelector('[data-flame]')) runFlame(view, `lighter-${key}`, t, on ? 1 : 0);
}

const at = (x: number, y: number, html: string) => `<div style="position:absolute;left:${x}px;top:${y}px">${html}</div>`;
const on = (t: number) => t >= 600 && t < 1800;

export const samples: DecorSample[] = [
  {
    name: 'lighter: gas',
    w: 130,
    h: 50,
    html: at(118, 28, lighter('gas')),
    duration: 2400,
    play: (view, t) => setLighter(view, 'gas', t, on(t)),
  },
  {
    name: 'lighter: flame, mirrored, scale 0.6',
    w: 120,
    h: 50,
    html: at(30, 28, lighter('flame', { kind: 'flame', mirror: true, scale: 0.6 })),
    duration: 2400,
    play: (view, t) => setLighter(view, 'flame', t, on(t)),
  },
  {
    name: 'lighter: flame, scale 0.55, flame 1.4',
    w: 120,
    h: 50,
    html: at(66, 28, lighter('long', { kind: 'flame', scale: 0.55, flameScale: 1.4 })),
    duration: 2400,
    play: (view, t) => setLighter(view, 'long', t, on(t)),
  },
];

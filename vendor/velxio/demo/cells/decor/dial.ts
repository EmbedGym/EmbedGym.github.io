import { BLUE, BLUE_TINT, FACE, FACE_EDGE, INK, MUTED, RED, type DecorSample, type DecorView } from './common';

const R = 42;
const SECTORS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

/** A point at `deg` clockwise from up, radius `r`, as "x y". */
const polar = (deg: number, r: number) => {
  const a = (deg * Math.PI) / 180;
  return `${(r * Math.sin(a)).toFixed(2)} ${(-r * Math.cos(a)).toFixed(2)}`;
};
const arcPath = (from: number, to: number, r: number) =>
  `M ${polar(from, r)} A ${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${polar(to, r)}`;

export interface DialOptions {
  /**
   * `needle`: a compass needle on a face with N at the top, for a heading.
   * `vector`: the magnetic field as an arrow on the sensor's X/Y axes (Y up).
   */
  pointer: 'needle' | 'vector';
  /** Needle only: the eight compass sectors, one lit by `setDial`. */
  sectors?: boolean;
  /** With `sectors`: marks each boundary's ±`hysteresis`° band, where a sketch keeps its old sector. */
  hysteresis?: number;
  scale?: number;
}

/**
 * A round compass dial 84 px across times `scale`, centred on the element's
 * (0, 0). Point it with `setDial`.
 */
export function dial(key: string, opts: DialOptions): string {
  const scale = opts.scale ?? 1;
  const text = `font-size="26" font-weight="700" style="font-family: var(--sans)" fill="${MUTED}"`;
  // Centred on its axis line, haloed in the face colour so the line breaks around it.
  const axisLabel = `font-size="17" font-weight="700" style="font-family: var(--sans)" fill="${MUTED}" text-anchor="middle" dominant-baseline="central" stroke="${FACE}" stroke-width="5" paint-order="stroke"`;
  let marks: string;
  let pointer: string;
  // Drawn after the pointer so the arrow never hides them.
  let labels = '';
  if (opts.pointer === 'needle') {
    const ticks = [0, 90, 180, 270]
      .map((deg) => {
        const [x1, y1] = polar(deg, R - 8).split(' ');
        const [x2, y2] = polar(deg, R).split(' ');
        return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${FACE_EDGE}" stroke-width="2" />`;
      })
      .join('');
    const wedges = opts.sectors
      ? SECTORS.map(
          (name, k) =>
            `<path class="d-dial-wedge" data-sector="${name}" d="M 0 0 L ${polar(45 * k - 22.5, R)} A ${R} ${R} 0 0 1 ${polar(45 * k + 22.5, R)} Z" fill="transparent" stroke="${FACE_EDGE}" stroke-width="1.5" />`,
        ).join('')
      : '';
    const h = opts.hysteresis;
    const bands =
      opts.sectors && h
        ? SECTORS.map((_, k) => `<path d="${arcPath(45 * k + 22.5 - h, 45 * k + 22.5 + h, R - 4)}" fill="none" stroke="${MUTED}" stroke-width="7" />`).join('')
        : '';
    marks = `${wedges}${bands}${ticks}<text x="0" y="${-R + 30}" text-anchor="middle" ${text}>N</text>
      <path class="d-dial-turned" fill="none" stroke="${BLUE}" stroke-width="6" stroke-linecap="round" style="opacity:0" />`;
    pointer = `
      <g class="d-dial-pointer">
        <line x1="0" y1="10" x2="0" y2="${-R + 16}" stroke="${RED}" stroke-width="5" stroke-linecap="round" />
        <path d="M 0 ${-R + 4} l -8 14 h 16 z" fill="${RED}" />
      </g>
      <circle r="4" fill="${INK}" />`;
  } else if (opts.pointer === 'vector') {
    marks = `
      <line x1="${-R}" y1="0" x2="${R}" y2="0" stroke="${FACE_EDGE}" stroke-width="2" />
      <line x1="0" y1="${R}" x2="0" y2="${-R}" stroke="${FACE_EDGE}" stroke-width="2" />`;
    labels = `
      <text x="${R - 12}" y="0" ${axisLabel}>X</text>
      <text x="0" y="${-R + 12}" ${axisLabel}>Y</text>`;
    pointer = `
      <g class="d-dial-pointer">
        <line x1="0" y1="0" x2="${R - 14}" y2="0" stroke="${RED}" stroke-width="5" stroke-linecap="round" />
        <path d="M ${R - 2} 0 l -16 -9 v 18 z" fill="${RED}" />
      </g>
      <circle r="4" fill="${INK}" />`;
  } else {
    throw new Error(`dial: unknown pointer ${opts.pointer}`);
  }
  return `
    <svg class="d-dial" data-dial="${key}" data-pointer="${opts.pointer}" width="1" height="1" overflow="visible" style="position:absolute;left:0;top:0">
      <g transform="scale(${scale})">
        <circle r="${R}" fill="${FACE}" stroke="${FACE_EDGE}" stroke-width="2" />
        ${marks}
        ${pointer}
        ${labels}
      </g>
    </svg>`;
}

export interface DialState {
  /** Needle: heading, degrees clockwise from N. Vector: field angle, degrees counter-clockwise from +X. */
  angle: number;
  /** Needle with sectors: the sector to light ('N', 'NE', …), or none. */
  sector?: string;
  /** Needle: an arc on the rim from `from` to `to` (clockwise degrees), for a turn. */
  turned?: { from: number; to: number; opacity: number };
}

/** Points dial `key` for this frame. */
export function setDial(view: DecorView, key: string, state: DialState) {
  const svg = view.q<SVGSVGElement>(`[data-dial="${key}"]`);
  const vector = svg.dataset.pointer === 'vector';
  svg.querySelector('.d-dial-pointer')!.setAttribute('transform', `rotate(${vector ? -state.angle : state.angle})`);
  svg.querySelectorAll<SVGPathElement>('.d-dial-wedge').forEach((w) => {
    w.setAttribute('fill', w.dataset.sector === state.sector ? BLUE_TINT : 'transparent');
  });
  const turned = svg.querySelector<SVGPathElement>('.d-dial-turned');
  if (turned) {
    turned.style.opacity = String(state.turned?.opacity ?? 0);
    if (state.turned) turned.setAttribute('d', arcPath(state.turned.from, state.turned.to, R - 4));
  }
}

const at = (x: number, y: number, html: string) => `<div style="position:absolute;left:${x}px;top:${y}px">${html}</div>`;
const sweep = (t: number, duration: number) => (360 * t) / duration;

export const samples: DecorSample[] = [
  {
    name: 'dial: needle',
    w: 110,
    h: 110,
    html: at(55, 55, dial('needle', { pointer: 'needle' })),
    duration: 4000,
    play: (view, t) => setDial(view, 'needle', { angle: sweep(t, 4000) }),
  },
  {
    name: 'dial: needle, sectors with hysteresis',
    w: 110,
    h: 110,
    html: at(55, 55, dial('sectors', { pointer: 'needle', sectors: true, hysteresis: 5 })),
    duration: 4000,
    play: (view, t) => {
      const angle = sweep(t, 4000);
      setDial(view, 'sectors', { angle, sector: SECTORS[Math.round(angle / 45) % 8] });
    },
  },
  {
    name: 'dial: needle, turn arc',
    w: 110,
    h: 110,
    html: at(55, 55, dial('turned', { pointer: 'needle' })),
    duration: 2400,
    play: (view, t) => {
      const k = Math.min(1, Math.max(0, (t - 300) / 600));
      setDial(view, 'turned', { angle: 45 + 45 * k, turned: { from: 45, to: 45 + 45 * k, opacity: t < 2000 ? 1 : 0 } });
    },
  },
  {
    name: 'dial: field vector',
    w: 110,
    h: 110,
    html: at(55, 55, dial('vector', { pointer: 'vector' })),
    duration: 4000,
    play: (view, t) => setDial(view, 'vector', { angle: -sweep(t, 4000) }),
  },
  {
    name: 'dial: scale 0.7',
    w: 80,
    h: 80,
    html: at(40, 40, dial('small', { pointer: 'needle', scale: 0.7 })),
  },
];

import { clamp, easeInOutCubic, lerp, mulberry32 } from '../../anim';
import type { Cell, CellView } from '../../cell';
import { hand as handPart, setHand } from '../../decor/hand';
import { USB, serialPanel, showSerial, type Print } from '../../kit';

// A warm hand stops left, centre and right of the AMG8833's view. Once a second
// the sketch finds the hottest pixel; 3 C or more above the module's thermistor
// (26 C here) it prints that pixel's zone by column, otherwise no zone.
export const DURATION = 6000;
export const READS = [500, 1500, 2500, 3500, 4500, 5500];

const rand = mulberry32(8833);
const ROOM = Array.from({ length: 64 }, () => 24 + 0.5 * Math.floor(rand() * 4));
const AMBIENT = 26;
// AMG8833 pixels resolve 0.25 C; half degrees keep the printed one-decimal values unambiguous.
const quantize = (v: number) => Math.round(v * 2) / 2;

/** Hand column (0..7, may sit outside) and how much of it is in view (0..1). */
// [time, column] stops; the hand glides between them.
const PATH: [number, number][] = [
  [700, -3],
  [1100, 1],
  [1900, 1],
  [2300, 3.5],
  [3100, 3.5],
  [3500, 6],
  [4600, 6],
  [5100, 10],
];
function hand(t: number) {
  let col = PATH[0][1];
  for (let k = 1; k < PATH.length; k++) {
    const [t0, c0] = PATH[k - 1];
    const [t1, c1] = PATH[k];
    if (t >= t0) col = lerp(c0, c1, easeInOutCubic(clamp((t - t0) / (t1 - t0))));
  }
  return { col, row: 3.5, heat: 9 };
}

function pixels(t: number) {
  const h = hand(t);
  return ROOM.map((room, i) => {
    const d2 = (i % 8 - h.col) ** 2 + (Math.floor(i / 8) - h.row) ** 2;
    return quantize(room + h.heat * Math.exp(-d2 / 2.5));
  });
}

const ZONES = ['Left', 'Center', 'Right'] as const;
const zoneOf = (col: number) => (col <= 2 ? 'Left' : col <= 4 ? 'Center' : 'Right');

function reading(t: number) {
  const px = pixels(t);
  // The sketch keeps the first of equal maxima.
  const hot = px.reduce((best, v, i) => (v > px[best] ? i : best), 0);
  return px[hot] - AMBIENT >= 3 ? { zone: zoneOf(hot % 8), temp: px[hot] } : null;
}
const READINGS = READS.map(reading);
const LOOP_PRINTS: Print[] = READS.map((t, i) => {
  const r = READINGS[i];
  return { t: t + 5, text: r ? `Zone: ${r.zone} Temp: ${r.temp.toFixed(1)} C` : 'Zone: None' };
});
// The previous loop's lines are already on screen at t=0, matching the end state.
export const PRINTS: Print[] = [...LOOP_PRINTS.map((p) => ({ ...p, t: p.t - DURATION })), ...LOOP_PRINTS];
const PANEL = { x: -350, y: USB.mega.y - 150, w: 330, h: 181 };

// The thermal view sits left of the sensor; the hand moves through the sensor's view above it.
const CELL = 17;
// Equal margins round the grid; the panel adds its borders and the last cell has no gap.
const MARGIN = 10;
const VIEW_W = 8 * CELL - 1 + 2 * MARGIN + 2;
// Columns 0-2, 3-4 and 5-7.
const BANDS = [
  [0, 3],
  [3, 5],
  [5, 8],
];
const LENS_X = 313.6;
const SPAN = 80;
const HAND_Y = -246;

function heatColor(temp: number) {
  const k = clamp((temp - 21) / 13);
  return `hsl(${lerp(230, 0, k)} 85% ${lerp(62, 52, k)}%)`;
}

/**
 * Where a card puts the heat map's top-left (`view`) and the middle of the hand's
 * path (`lens`); the hand crosses the sensor's columns left to right, or top to
 * bottom with `down` (for a sensor turned 90°). `handScale` sizes the hand.
 */
export type Place = { view: { x: number; y: number }; lens: { x: number; y: number }; down?: boolean; handScale?: number };

/**
 * The heat map with its Left/Center/Right bands, the last reported zone
 * highlighted, and the warm hand. `font` sizes the band letters (22 px by
 * default); `prefix` keeps the class names the card's own.
 */
export function scene(prefix: string, p: Place & { font?: number }) {
  const f = p.font ?? 22;
  // The bands' row: their brackets, then the letters.
  const row = (38 * f) / 22;
  const h = 34 + 8 * CELL - 1 + 2 * MARGIN + 2 + row;
  const html = `
      <style>
        .${prefix}-band { fill: none; stroke: var(--muted); stroke-width: 2; }
        .${prefix}-label { font: 600 ${f}px var(--sans); fill: var(--muted); text-anchor: middle; }
        .${prefix}-label.on { fill: var(--accent); font-weight: 800; }
      </style>
      <div class="k-serial ${prefix}-view" style="left:${p.view.x}px;top:${p.view.y}px;width:${VIEW_W}px;height:${h}px">
        <div class="k-serial-head" style="white-space:nowrap"><span>Heat map</span><span class="k-serial-note">8×8</span></div>
        <svg class="${prefix}-grid" style="position:absolute;left:${MARGIN}px;top:${34 + MARGIN}px" width="${8 * CELL}" height="${8 * CELL + row - 4}">
          ${ROOM.map((_, i) => `<rect x="${(i % 8) * CELL}" y="${Math.floor(i / 8) * CELL}" width="${CELL - 1}" height="${CELL - 1}" rx="2" />`).join('')}
          ${BANDS.map(([a, b], k) => {
            const x0 = a * CELL + 2;
            const x1 = b * CELL - 3;
            const y = 8 * CELL + 4;
            return `<path class="${prefix}-band" d="M ${x0} ${y} v 5 H ${x1} v -5" />
              <text class="${prefix}-label" data-zone="${ZONES[k]}" x="${(x0 + x1) / 2}" y="${y + (28 * f) / 22}">${ZONES[k][0]}</text>`;
          }).join('')}
        </svg>
      </div>
      ${handPart(`${prefix}-hand`, { warm: true, scale: p.handScale })}`;
  const run = (view: CellView, t: number) => {
    const px = pixels(t);
    const last = READINGS[READS.filter((r) => r + 5 <= t).length - 1];
    view.qa<SVGTextElement>(`.${prefix}-label`).forEach((label) => label.classList.toggle('on', label.dataset.zone === last?.zone));
    view.qa<SVGRectElement>(`.${prefix}-grid rect`).forEach((cell, i) => cell.setAttribute('fill', heatColor(px[i])));
    const h = hand(t);
    const along = -SPAN / 2 + ((h.col + 0.5) / 8) * SPAN;
    const palm = p.down ? { x: p.lens.x, y: p.lens.y + along } : { x: p.lens.x + along, y: p.lens.y };
    setHand(view, `${prefix}-hand`, palm, { opacity: clamp(1 - Math.max(-0.5 - h.col, h.col - 7.5)) });
  };
  return { html, run, w: VIEW_W, h };
}

const SCENE = scene('c-ampz', { view: { x: 82, y: -266 }, lens: { x: LENS_X, y: HAND_Y + 67.5 }, font: 25 });

const amg8833HotspotZone: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('out', PANEL, { note: '115200', cableTo: USB.mega, wrap: true })}
      ${SCENE.html}`,
    bounds: [PANEL.x, HAND_Y, LENS_X + SPAN / 2 + 36, PANEL.y + PANEL.h],
  },
  activity: [{ wires: ['w-SDA', 'w-SCL'], at: READS }],
  run(t, view) {
    SCENE.run(view, t);
    showSerial(view, 'out', t, PRINTS, { board: 'arduino-mega' });
  },
};

export default amg8833HotspotZone;

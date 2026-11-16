import { clamp, easeInOutCubic, lerp, mulberry32 } from '../../anim';
import type { Cell, CellView } from '../../cell';
import { hand as handPart, setHand } from '../../decor/hand';
import { USB, serialPanel, showSerial, type Print } from '../../kit';

// A warm hand passes over the AMG8833. Once a second the sketch reads all 64
// pixels and prints their minimum, maximum and mean; the hand lifts the maximum
// and the mean while it is in view.
export const DURATION = 6000;
export const READS = [500, 1500, 2500, 3500, 4500, 5500];

const rand = mulberry32(8833);
const ROOM = Array.from({ length: 64 }, () => 22 + 0.5 * Math.floor(rand() * 4));
// AMG8833 pixels resolve 0.25 C; half degrees keep the printed one-decimal values unambiguous.
const quantize = (v: number) => Math.round(v * 2) / 2;

/** Hand column (0..7, may sit outside) and how much of it is in view (0..1). */
function hand(t: number) {
  const p = clamp((t - 1100) / 3400);
  return { col: lerp(-3, 10, easeInOutCubic(p)), row: 3.5, heat: 11 };
}

function pixels(t: number) {
  const h = hand(t);
  return ROOM.map((room, i) => {
    const d2 = (i % 8 - h.col) ** 2 + (Math.floor(i / 8) - h.row) ** 2;
    return quantize(room + h.heat * Math.exp(-d2 / 2.5));
  });
}

const LOOP_PRINTS: Print[] = READS.map((t) => {
  const px = pixels(t);
  const avg = px.reduce((a, b) => a + b, 0) / 64;
  return { t: t + 5, text: `Min: ${Math.min(...px).toFixed(1)} Max: ${Math.max(...px).toFixed(1)} Avg: ${avg.toFixed(1)} C` };
});
// The previous loop's lines are already on screen at t=0, matching the end state.
export const PRINTS: Print[] = [...LOOP_PRINTS.map((p) => ({ ...p, t: p.t - DURATION })), ...LOOP_PRINTS];
const PANEL = { x: -350, y: USB.mega.y - 150, w: 330, h: 181 };

// The thermal view sits left of the sensor; the hand moves through the sensor's view above it.
const CELL = 17;
// Equal margins round the grid; the panel adds its borders and the last cell has no gap.
const MARGIN = 10;
const VIEW_W = 8 * CELL - 1 + 2 * MARGIN + 2;
const VIEW_H = 34 + 8 * CELL - 1 + 2 * MARGIN + 2;
const LENS_X = 313.6;
const SPAN = 80;
const HAND_Y = -246;

export function heatColor(temp: number) {
  const k = clamp((temp - 21) / 13);
  return `hsl(${lerp(230, 0, k)} 85% ${lerp(62, 52, k)}%)`;
}

/**
 * Where a card puts the heat map's top-left (`view`) and the middle of the hand's
 * path (`lens`); the hand crosses the sensor's columns left to right, or top to
 * bottom with `down` (for a sensor turned 90°). `handScale` sizes the hand.
 */
export type Place = { view: { x: number; y: number }; lens: { x: number; y: number }; down?: boolean; handScale?: number };

/** The heat map and the warm hand; `prefix` keeps the class names the card's own. */
export function scene(prefix: string, p: Place) {
  const html = `
      <div class="k-serial ${prefix}-view" style="left:${p.view.x}px;top:${p.view.y}px;width:${VIEW_W}px;height:${VIEW_H}px">
        <div class="k-serial-head" style="white-space:nowrap"><span>Heat map</span><span class="k-serial-note">8×8</span></div>
        <svg class="${prefix}-grid" style="position:absolute;left:${MARGIN}px;top:${34 + MARGIN}px" width="${8 * CELL}" height="${8 * CELL}">
          ${ROOM.map((_, i) => `<rect x="${(i % 8) * CELL}" y="${Math.floor(i / 8) * CELL}" width="${CELL - 1}" height="${CELL - 1}" rx="2" />`).join('')}
        </svg>
      </div>
      ${handPart(`${prefix}-hand`, { warm: true, scale: p.handScale })}`;
  const run = (view: CellView, t: number) => {
    const px = pixels(t);
    view.qa<SVGRectElement>(`.${prefix}-grid rect`).forEach((cell, i) => cell.setAttribute('fill', heatColor(px[i])));
    const h = hand(t);
    const along = -SPAN / 2 + ((h.col + 0.5) / 8) * SPAN;
    const palm = p.down ? { x: p.lens.x, y: p.lens.y + along } : { x: p.lens.x + along, y: p.lens.y };
    setHand(view, `${prefix}-hand`, palm, { opacity: clamp(1 - Math.max(-0.5 - h.col, h.col - 7.5)) });
  };
  return { html, run, w: VIEW_W, h: VIEW_H };
}

const SCENE = scene('c-ampx', { view: { x: 82, y: -228 }, lens: { x: LENS_X, y: HAND_Y + 67.5 } });

const amg8833PixelMinMaxAverage: Cell = {
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

export default amg8833PixelMinMaxAverage;

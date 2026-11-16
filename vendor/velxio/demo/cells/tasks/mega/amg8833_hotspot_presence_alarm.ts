import { clamp, easeInOutCubic, lerp, mulberry32 } from '../../anim';
import type { Cell, CellView } from '../../cell';
import { hand as handPart, setHand } from '../../decor/hand';
import { USB, serialPanel, showSerial, type Print } from '../../kit';

// A warm hand comes into the AMG8833's view, moves and leaves. Once a second the
// sketch finds the hottest pixel: above 30 C it lights the LED on pin 4 and prints
// that pixel's row, column and temperature; otherwise it turns the LED off.
export const DURATION = 6000;
export const READS = [500, 1500, 2500, 3500, 4500, 5500];

const rand = mulberry32(8833);
const ROOM = Array.from({ length: 64 }, () => 22 + 0.5 * Math.floor(rand() * 4));
// AMG8833 pixels resolve 0.25 C; half degrees keep the printed one-decimal values unambiguous.
const quantize = (v: number) => Math.round(v * 2) / 2;

/** Hand column (0..7, may sit outside) and how much of it is in view (0..1). */
const PATH: [number, number][] = [
  [800, -3],
  [1300, 2],
  [2200, 2],
  [2700, 5],
  [3700, 5],
  [4200, 10],
];
function hand(t: number) {
  let col = PATH[0][1];
  for (let k = 1; k < PATH.length; k++) {
    const [t0, c0] = PATH[k - 1];
    const [t1, c1] = PATH[k];
    if (t >= t0) col = lerp(c0, c1, easeInOutCubic(clamp((t - t0) / (t1 - t0))));
  }
  return { col, row: 3.2, heat: 11 };
}

function pixels(t: number) {
  const h = hand(t);
  return ROOM.map((room, i) => {
    const d2 = (i % 8 - h.col) ** 2 + (Math.floor(i / 8) - h.row) ** 2;
    return quantize(room + h.heat * Math.exp(-d2 / 2.5));
  });
}

function reading(t: number) {
  const px = pixels(t);
  // The sketch keeps the first of equal maxima.
  const hot = px.reduce((best, v, i) => (v > px[best] ? i : best), 0);
  return px[hot] > 30 ? { row: Math.floor(hot / 8), col: hot % 8, temp: px[hot] } : null;
}
const READINGS = READS.map(reading);
const LOOP_PRINTS: Print[] = READS.map((t, i) => {
  const r = READINGS[i];
  return {
    t: t + 5,
    text: r ? `Hotspot Row: ${r.row} Col: ${r.col} Temp: ${r.temp.toFixed(1)} C, Presence: detected` : 'Presence: none',
  };
});
export const ledOn = (t: number) => READINGS[READS.filter((r) => r + 5 <= t).length - 1] != null;
// The previous loop's lines are already on screen at t=0, matching the end state.
export const PRINTS: Print[] = [...LOOP_PRINTS.map((p) => ({ ...p, t: p.t - DURATION })), ...LOOP_PRINTS];
const PANEL = { x: -350, y: USB.mega.y - 238, w: 330, h: 248 };

// The thermal view sits left of the sensor; the hand moves through the sensor's view above it.
const CELL = 14;
// Equal margins round the grid; the panel adds its borders and the last cell has no gap.
const MARGIN = 10;
const VIEW = { x: 100, y: -239, w: 8 * CELL - 1 + 2 * MARGIN + 2, h: 34 + 8 * CELL - 1 + 2 * MARGIN + 2 };
const LENS_X = 313.6;
const SPAN = 80;
const HAND_Y = -219;

function heatColor(temp: number) {
  const k = clamp((temp - 21) / 13);
  return `hsl(${lerp(230, 0, k)} 85% ${lerp(62, 52, k)}%)`;
}

/**
 * Where a card puts the heat map's top-left (`view`) and the middle of the hand's
 * path (`lens`); the hand crosses the sensor's columns left to right, or top to
 * bottom with `down` (for a sensor turned 90°).
 */
export type Place = { view: { x: number; y: number }; lens: { x: number; y: number }; down?: boolean };

/** The heat map and the warm hand; `prefix` keeps the class names the card's own. */
export function scene(prefix: string, p: Place) {
  const html = `
      <div class="k-serial ${prefix}-view" style="left:${p.view.x}px;top:${p.view.y}px;width:${VIEW.w}px;height:${VIEW.h}px">
        <div class="k-serial-head" style="white-space:nowrap"><span>Heat map</span></div>
        <svg class="${prefix}-grid" style="position:absolute;left:${MARGIN}px;top:${34 + MARGIN}px" width="${8 * CELL}" height="${8 * CELL}">
          ${ROOM.map((_, i) => `<rect x="${(i % 8) * CELL}" y="${Math.floor(i / 8) * CELL}" width="${CELL - 1}" height="${CELL - 1}" rx="2" />`).join('')}
        </svg>
      </div>
      ${handPart(`${prefix}-hand`, { warm: true, scale: 0.8 })}`;
  const run = (view: CellView, t: number) => {
    // The heat map holds the frame the sketch last read, so it agrees with the LED and the monitor.
    const sampled = READS.filter((r) => r + 5 <= t);
    const px = pixels(sampled.length ? sampled[sampled.length - 1] : READS[READS.length - 1]);
    view.qa<SVGRectElement>(`.${prefix}-grid rect`).forEach((cell, i) => cell.setAttribute('fill', heatColor(px[i])));
    const h = hand(t);
    const along = -SPAN / 2 + ((h.col + 0.5) / 8) * SPAN;
    const palm = p.down ? { x: p.lens.x, y: p.lens.y + along } : { x: p.lens.x + along, y: p.lens.y };
    setHand(view, `${prefix}-hand`, palm, { opacity: clamp(1 - Math.max(-0.5 - h.col, h.col - 7.5)) });
  };
  return { html, run, w: VIEW.w, h: VIEW.h };
}

const SCENE = scene('c-amp', { view: { x: VIEW.x, y: VIEW.y }, lens: { x: LENS_X, y: HAND_Y + 54 } });

const amg8833HotspotPresenceAlarm: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('out', PANEL, { note: '115200', cableTo: USB.mega, wrap: true })}
      ${SCENE.html}`,
    bounds: [PANEL.x, HAND_Y, LENS_X + SPAN / 2 + 29, PANEL.y + PANEL.h],
  },
  activity: [{ wires: ['w-SDA', 'w-SCL'], at: READS }],
  run(t, view) {
    SCENE.run(view, t);
    view.part<HTMLElement & { value: boolean }>('L1').value = ledOn(t);
    if (ledOn(t)) {
      view.glowWire('w-D4-resistor', 1);
      view.glowWire('w-resistor-LED', 1);
    }
    showSerial(view, 'out', t, PRINTS, { board: 'arduino-mega' });
  },
};

export default amg8833HotspotPresenceAlarm;

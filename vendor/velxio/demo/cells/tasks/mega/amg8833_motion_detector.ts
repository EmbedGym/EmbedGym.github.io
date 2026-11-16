import { clamp, lerp, mulberry32 } from '../../anim';
import type { Cell, CellView } from '../../cell';
import { hand as handPart, setHand } from '../../decor/hand';
import { USB, serialPanel, showSerial, type Print } from '../../kit';

// A warm hand sweeps across the AMG8833's view. The sketch compares frames 200 ms
// apart, counts pixels that changed by more than 1 C, and once a second prints the
// largest count; 4 or more is motion, and the first second of motion also prints
// MOTION DETECTED.
export const DURATION = 6000;
const REPORTS = [500, 1500, 2500, 3500, 4500, 5500];
export const FRAMES = Array.from({ length: DURATION / 200 }, (_, k) => 100 + 200 * k);

const rand = mulberry32(8833);
const ROOM = Array.from({ length: 64 }, () => 22 + 0.5 * Math.floor(rand() * 4));
// AMG8833 pixels resolve 0.25 C; half degrees keep the printed one-decimal values unambiguous.
const quantize = (v: number) => Math.round(v * 2) / 2;

/** Hand column (0..7, may sit outside) and how much of it is in view (0..1). */
function hand(t: number) {
  return { col: lerp(-3, 10, clamp((t - 1200) / 3000)), row: 3.5, heat: 11 };
}

function pixels(t: number) {
  const h = hand(t);
  return ROOM.map((room, i) => {
    const d2 = (i % 8 - h.col) ** 2 + (Math.floor(i / 8) - h.row) ** 2;
    return quantize(room + h.heat * Math.exp(-d2 / 2.5));
  });
}

const changedAt = (t: number) => {
  const now = pixels(t);
  const before = pixels(t - 200);
  return now.filter((v, i) => Math.abs(v - before[i]) > 1).length;
};
const LOOP_PRINTS: Print[] = [];
let wasMoving = false;
for (const t of REPORTS) {
  const counts = FRAMES.filter((f) => f > t - 1000 && f <= t).map(changedAt);
  const most = Math.max(...counts);
  const moving = most >= 4;
  LOOP_PRINTS.push({ t: t + 5, text: `Changed pixels: ${most} Motion: ${moving ? 'yes' : 'no'}` });
  if (moving && !wasMoving) LOOP_PRINTS.push({ t: t + 9, text: 'MOTION DETECTED' });
  wasMoving = moving;
}
// The previous loop's lines are already on screen at t=0, matching the end state.
export const PRINTS: Print[] = [...LOOP_PRINTS.map((p) => ({ ...p, t: p.t - DURATION })), ...LOOP_PRINTS];
const PANEL = { x: -350, y: USB.mega.y - 218, w: 330, h: 249 };

// The thermal view sits left of the sensor; the hand moves through the sensor's view above it.
const CELL = 17;
// Equal margins round the grid; the panel adds its borders and the last cell has no gap.
const MARGIN = 10;
const VIEW_W = 8 * CELL - 1 + 2 * MARGIN + 2;
const VIEW_H = 34 + 8 * CELL - 1 + 2 * MARGIN + 2;
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

/** The heat map, outlining the pixels that changed, and the warm hand; `prefix` keeps the class names the card's own. */
export function scene(prefix: string, p: Place) {
  const html = `
      <style>
        .${prefix}-grid rect.moved { stroke: var(--ink); stroke-width: 2.5; }
      </style>
      <div class="k-serial ${prefix}-view" style="left:${p.view.x}px;top:${p.view.y}px;width:${VIEW_W}px;height:${VIEW_H}px">
        <div class="k-serial-head" style="white-space:nowrap"><span>Heat map</span><span class="k-serial-note">8×8</span></div>
        <svg class="${prefix}-grid" style="position:absolute;left:${MARGIN}px;top:${34 + MARGIN}px" width="${8 * CELL}" height="${8 * CELL}">
          ${ROOM.map((_, i) => `<rect x="${(i % 8) * CELL}" y="${Math.floor(i / 8) * CELL}" width="${CELL - 1}" height="${CELL - 1}" rx="2" />`).join('')}
        </svg>
      </div>
      ${handPart(`${prefix}-hand`, { warm: true, scale: p.handScale })}`;
  const run = (view: CellView, t: number) => {
    // The board sees the frame it last read.
    const frame = pixels(Math.floor((t - 100) / 200) * 200 + 100);
    const prev = pixels(Math.floor((t - 100) / 200) * 200 - 100);
    view.qa<SVGRectElement>(`.${prefix}-grid rect`).forEach((cell, i) => {
      cell.setAttribute('fill', heatColor(frame[i]));
      cell.classList.toggle('moved', Math.abs(frame[i] - prev[i]) > 1);
    });
    const h = hand(t);
    const along = -SPAN / 2 + ((h.col + 0.5) / 8) * SPAN;
    const palm = p.down ? { x: p.lens.x, y: p.lens.y + along } : { x: p.lens.x + along, y: p.lens.y };
    setHand(view, `${prefix}-hand`, palm, { opacity: clamp(1 - Math.max(-0.5 - h.col, h.col - 7.5)) });
  };
  return { html, run, w: VIEW_W, h: VIEW_H };
}

const SCENE = scene('c-ampm', { view: { x: 82, y: -228 }, lens: { x: LENS_X, y: HAND_Y + 67.5 } });

const amg8833MotionDetector: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('out', PANEL, { note: '115200', cableTo: USB.mega, wrap: true })}
      ${SCENE.html}`,
    bounds: [PANEL.x, HAND_Y, LENS_X + SPAN / 2 + 36, PANEL.y + PANEL.h],
  },
  activity: [{ wires: ['w-SDA', 'w-SCL'], at: FRAMES }],
  run(t, view) {
    SCENE.run(view, t);
    showSerial(view, 'out', t, PRINTS, { board: 'arduino-mega' });
  },
};

export default amg8833MotionDetector;

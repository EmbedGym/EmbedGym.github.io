import type { Cell } from '../../cell';
import { setWater, waterGlass } from '../../decor/water';
import { DURATION, GLASS, KEYS, barRow, readingOn } from '../mega/sensor_water_level_display';

// | board    | arduino-uno                        |
// | LCD bus  | w-12-RS, w-11-E, w-4-D4 … w-7-D7   |
// | probe S  | w-A2-signal                        |

type Lcd = HTMLElement & { text: string };

const LCD_BUS = ['w-12-RS', 'w-11-E', 'w-4-D4', 'w-5-D5', 'w-6-D6', 'w-7-D7'];
const readingAt = (t: number) => readingOn(KEYS, t);

// Cell coordinates: the probe hangs pins-up between the board and LCD1, its top at y 64;
// its sense traces span y 122..186 and the glass hangs round them.
const GLASS_AT = { x: 314, y: 107 };
const GLASS_H = 70 * GLASS.scale;
const TRACE_TOP = 122;
const TRACE_END = 186;
const waterTop = (level: number) => TRACE_END - (level / 1023) * (TRACE_END - TRACE_TOP);
const BADGE = { x: 440, y: 180, w: 128, h: 62 };
// LCD1's two rows again, upright, right of it: the turned LCD reads top to bottom.
const READ = { x: 578, y: -50, w: 294, h: 82 };

const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-wlu-badge {
          position: absolute; left: ${BADGE.x}px; top: ${BADGE.y}px; width: ${BADGE.w}px; height: ${BADGE.h}px;
          box-sizing: border-box; display: flex; align-items: center; justify-content: center; gap: 10px;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
          font: 600 28px var(--mono); color: var(--ink);
        }
        .c-wlu-pin { color: var(--muted); }
        .c-wlu-val { color: #8b4513; }
        .c-wlu-read { position: absolute; left: ${READ.x}px; top: ${READ.y}px; width: ${READ.w}px; height: ${READ.h}px; box-sizing: border-box;
          padding: 6px 9px; border-radius: 4px; background: #6cb201; border: 3px solid #1f2937;
          font: 600 28px/33px ui-monospace, Menlo, monospace; color: #000; white-space: pre; overflow: hidden; }
      </style>
      ${waterGlass('g', GLASS_AT.x, GLASS_AT.y, { kind: 'tall', scale: GLASS.scale })}
      <div class="c-wlu-badge"><span class="c-wlu-pin">A2</span><span class="c-wlu-val"></span></div>
      <div class="c-wlu-read"></div>`,
    bounds: [GLASS_AT.x - 2, READ.y, READ.x + READ.w, BADGE.y + BADGE.h],
  },
  run(t, view) {
    const level = readingAt(t);
    setWater(view, 'g', (GLASS_AT.y + GLASS_H - waterTop(level)) / GLASS_H);
    view.q<HTMLElement>('.c-wlu-val').textContent = String(Math.round(level));
    view.glowWire('w-A2-signal', level / 1023);

    const row = barRow(readingAt(Math.floor(t / 100) * 100));
    view.part<Lcd>('LCD1').text = `Water Level     ${row}`;
    view.q<HTMLElement>('.c-wlu-read').textContent = `Water Level\n${row}`;
  },
  // Every 100 ms loop() sets the cursor and rewrites all of row 1.
  activity: [{ wires: LCD_BUS, at: Array.from({ length: DURATION / 100 }, (_, i) => i * 100) }],
};

export default cell;

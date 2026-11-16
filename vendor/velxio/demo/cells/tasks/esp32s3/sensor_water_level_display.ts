import type { Cell } from '../../cell';
import { setWater, waterGlass } from '../../decor/water';
import { DURATION, GLASS, KEYS, barRow, readingOn } from '../mega/sensor_water_level_display';

// | board    | esp32-s3                                     |
// | LCD bus  | w-38-RS, w-39-E, w-40-D4 … w-42-D6, w-21-D7  |
// | probe S  | w-9-signal (ADC1 CH8)                        |

type Lcd = HTMLElement & { text: string };

const LCD_BUS = ['w-38-RS', 'w-39-E', 'w-40-D4', 'w-41-D5', 'w-42-D6', 'w-21-D7'];
const readingAt = (t: number) => readingOn(KEYS, t);

// Cell coordinates: the probe hangs pins-up left of the board, its top at y 136;
// its sense traces span y 194..258 and the glass hangs round them.
const GLASS_AT = { x: -112, y: 179 };
const GLASS_H = 70 * GLASS.scale;
const TRACE_TOP = 194;
const TRACE_END = 258;
const waterTop = (level: number) => TRACE_END - (level / 1023) * (TRACE_END - TRACE_TOP);
const BADGE = { x: -262, y: 186, w: 140, h: 100 };

const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-wle-badge {
          position: absolute; left: ${BADGE.x}px; top: ${BADGE.y}px; width: ${BADGE.w}px; height: ${BADGE.h}px;
          box-sizing: border-box; display: flex; flex-direction: column; align-items: center; justify-content: center;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
          font: 600 38px/44px var(--mono); color: var(--ink);
        }
        .c-wle-pin { color: var(--muted); }
        .c-wle-val { color: #8b4513; }
      </style>
      ${waterGlass('g', GLASS_AT.x, GLASS_AT.y, { kind: 'tall', scale: GLASS.scale })}
      <div class="c-wle-badge"><span class="c-wle-pin">GPIO9</span><span class="c-wle-val"></span></div>`,
    bounds: [BADGE.x, GLASS_AT.y, GLASS_AT.x + 72, GLASS_AT.y + GLASS_H + 2],
  },
  run(t, view) {
    const level = readingAt(t);
    setWater(view, 'g', (GLASS_AT.y + GLASS_H - waterTop(level)) / GLASS_H);
    view.glowWire('w-9-signal', level / 1023);

    // app_main samples the 12-bit raw value every 100 ms and shifts it to 10 bits for the bar.
    const raw = Math.round((readingAt(Math.floor(t / 100) * 100) * 4095) / 1023);
    view.q<HTMLElement>('.c-wle-val').textContent = String(raw);
    const row = barRow(raw >> 2);
    view.part<Lcd>('LCD1').text = `Water Level     ${row}`;
  },
  // Every 100 ms app_main sets the cursor and rewrites all of row 1.
  activity: [{ wires: LCD_BUS, at: Array.from({ length: DURATION / 100 }, (_, i) => i * 100) }],
};

export default cell;

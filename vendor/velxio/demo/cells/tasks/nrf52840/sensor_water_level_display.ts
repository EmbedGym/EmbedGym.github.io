import type { Cell } from '../../cell';
import { setWater, waterGlass } from '../../decor/water';
import { DURATION, GLASS, readingOn } from '../mega/sensor_water_level_display';

// | board    | nrf52840-dk                                          |
// | LCD bus  | w-P0.04-RS, w-P0.05-E, w-P0.02-D4, w-P0.31-D5 … D7   |
// | probe S  | w-P0.03-signal (AIN1)                                |

type Lcd = HTMLElement & { text: string };

const LCD_BUS = ['w-P0.04-RS', 'w-P0.05-E', 'w-P0.02-D4', 'w-P0.31-D5', 'w-P0.29-D6', 'w-P0.30-D7'];
// The Mega's story on test.jsonl's levels: settle at 283, drain to 144, fill to 1023, settle back.
const KEYS: [number, number][] = [
  [0, 283],
  [700, 283],
  [1500, 144],
  [2500, 144],
  [3400, 1023],
  [4500, 1023],
  [5300, 283],
];
const readingAt = (t: number) => readingOn(KEYS, t);

// main() reads the 12-bit SAADC (3.6 V full scale) in mV and draws mv·16/3300 '#' centred on row 1.
function mvAt(t: number) {
  const level = readingAt(Math.floor(t / 100) * 100);
  const raw = Math.round(((3300 * level) / 1023) * (4095 / 3600));
  return Math.trunc((raw * 3600) / 4095);
}
function barRow(mv: number) {
  const bars = Math.trunc((Math.min(mv, 3300) * 16) / 3300);
  const left = Math.trunc((16 - bars) / 2);
  return Array.from({ length: 16 }, (_, i) => (i >= left && i < left + bars ? '#' : ' ')).join('');
}

// Cell coordinates: the probe hangs pins-up under the DK's bottom-left, its top at y 288;
// its sense traces span y 346..410 and the glass hangs round them.
const GLASS_AT = { x: 79.6, y: 331 };
const GLASS_H = 70 * GLASS.scale;
const TRACE_TOP = 346;
const TRACE_END = 410;
const waterTop = (level: number) => TRACE_END - (level / 1023) * (TRACE_END - TRACE_TOP);
const BADGE = { x: 166, y: 322, w: 176, h: 92 };
// LCD1's two rows again, upright, above it: the turned LCD reads top to bottom.
const READ = { x: 572, y: 8, w: 336, h: 90 };

const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-wln-badge {
          position: absolute; left: ${BADGE.x}px; top: ${BADGE.y}px; width: ${BADGE.w}px; height: ${BADGE.h}px;
          box-sizing: border-box; display: flex; flex-direction: column; align-items: center; justify-content: center;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
          font: 600 32px/38px var(--mono); color: var(--ink);
        }
        .c-wln-pin { color: var(--muted); }
        .c-wln-val { color: #8b4513; }
        .c-wln-read { position: absolute; left: ${READ.x}px; top: ${READ.y}px; width: ${READ.w}px; height: ${READ.h}px; box-sizing: border-box;
          padding: 6px 9px; border-radius: 4px; background: #6cb201; border: 3px solid #1f2937;
          font: 600 32px/37px ui-monospace, Menlo, monospace; color: #000; white-space: pre; overflow: hidden; }
      </style>
      ${waterGlass('g', GLASS_AT.x, GLASS_AT.y, { kind: 'tall', scale: GLASS.scale })}
      <div class="c-wln-badge"><span class="c-wln-pin">P0.03</span><span class="c-wln-val"></span></div>
      <div class="c-wln-read"></div>`,
    bounds: [GLASS_AT.x - 2, READ.y, READ.x + READ.w, GLASS_AT.y + GLASS_H + 2],
  },
  run(t, view) {
    const level = readingAt(t);
    setWater(view, 'g', (GLASS_AT.y + GLASS_H - waterTop(level)) / GLASS_H);
    view.glowWire('w-P0.03-signal', level / 1023);

    const mv = mvAt(t);
    view.q<HTMLElement>('.c-wln-val').textContent = `${mv} mV`;
    const row = barRow(mv);
    view.part<Lcd>('LCD1').text = `Water Level     ${row}`;
    view.q<HTMLElement>('.c-wln-read').textContent = `Water Level\n${row}`;
  },
  // Every 100 ms main() sets the cursor and rewrites all of row 1.
  activity: [{ wires: LCD_BUS, at: Array.from({ length: DURATION / 100 }, (_, i) => i * 100) }],
};

export default cell;

import type { Cell } from '../../cell';
import { finger, pressFinger } from '../../decor/finger';
import { motion, setMotion } from '../../decor/motion';
import { DURATION, KNOCK_MS, LAST, PRESSES, ROUNDS, SCREENS, stopwatchAt } from '../mega/reaction_timer_display';

// | board    | arduino-uno                        |
// | LCD bus  | w-12-RS, w-11-E, w-4-D4 … w-7-D7   |
// | button   | w-2-BTN, w-2-RPD (D2)              |
// | shock    | w-3-signal (D3)                    |

type Lcd = HTMLElement & { text: string };
type Button = HTMLElement & { pressed: boolean };

const LCD_BUS = ['w-12-RS', 'w-11-E', 'w-4-D4', 'w-5-D5', 'w-6-D6', 'w-7-D7'];
// Cell coordinates: the shock sensor spans x 448..508, y 36..100 with its pins facing the
// board, so its knock marks and the stopwatch go on its right. LCD1 is turned 270° left of the board, so its
// rows are repeated upright above the board.
const PANEL = { x: 560, y: 20, w: 216, h: 106 };
const READ = { x: 0, y: -245, w: 320, h: 98 };

const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-rtu-panel {
          position: absolute; left: ${PANEL.x}px; top: ${PANEL.y}px; width: ${PANEL.w}px; height: ${PANEL.h}px;
          box-sizing: border-box; padding: 6px 14px; display: flex; flex-direction: column; justify-content: center;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
        }
        .c-rtu-title { font: 600 36px/44px var(--sans); color: var(--muted); }
        .c-rtu-ms { font: 600 36px/44px var(--mono); color: var(--ink); white-space: nowrap; }
        .c-rtu-ms.c-rtu-run { color: var(--accent); }
        .c-rtu-read { position: absolute; left: ${READ.x}px; top: ${READ.y}px; width: ${READ.w}px; height: ${READ.h}px; box-sizing: border-box;
          padding: 6px 9px; border-radius: 4px; background: #6cb201; border: 3px solid #1f2937;
          font: 600 36px/41px ui-monospace, Menlo, monospace; color: #000; white-space: pre; overflow: hidden; }
      </style>
      ${motion('knock')}
      <div class="c-rtu-panel"><div class="c-rtu-title">Stopwatch</div><div class="c-rtu-ms"></div></div>
      <div class="c-rtu-read"></div>
      ${finger('f', { length: 48 })}`,
    bounds: [Math.min(PANEL.x, READ.x), Math.min(PANEL.y, READ.y), Math.max(PANEL.x + PANEL.w, READ.x + READ.w), Math.max(PANEL.y + PANEL.h, READ.y + READ.h)],
  },
  run(t, view) {
    const watch = stopwatchAt(t);
    const ms = view.q<HTMLElement>('.c-rtu-ms');
    ms.textContent = `${Math.round(watch.ms)} ms`;
    ms.classList.toggle('c-rtu-run', watch.running);

    const btn = view.box('BTN');
    const pressing = pressFinger(view, 'f', t, { x: btn.x + btn.w / 2, y: btn.y + btn.h / 2 + 4 }, PRESSES);
    view.part<Button>('BTN').pressed = pressing;
    if (pressing) {
      view.glowWire('w-2-BTN', 1);
      view.glowWire('w-2-RPD', 1);
    }
    const knocking = ROUNDS.some((r) => t >= r.shock && t < r.shock + KNOCK_MS);
    setMotion(view, 'knock', view.box('SH1'), knocking ? 1 : 0, { sides: 'right' });
    if (knocking) view.glowWire('w-3-signal', 1);

    const text = SCREENS.filter((s) => s.at <= t).pop()?.text ?? LAST;
    view.part<Lcd>('LCD1').text = text;
    view.q<HTMLElement>('.c-rtu-read').textContent = `${text.slice(0, 16).trimEnd()}\n${text.slice(16).trimEnd()}`;
  },
  activity: [{ wires: LCD_BUS, at: SCREENS.map((s) => s.at - 3) }],
};

export default cell;

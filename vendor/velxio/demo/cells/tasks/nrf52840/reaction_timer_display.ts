import type { Cell } from '../../cell';
import { finger, pressFinger } from '../../decor/finger';
import { motion, setMotion } from '../../decor/motion';
import { DURATION, KNOCK_MS, LAST, PRESSES, ROUNDS, SCREENS, stopwatchAt } from '../mega/reaction_timer_display';

// | board    | nrf52840-dk                                          |
// | LCD bus  | w-P0.04-RS, w-P0.05-E, w-P0.02-D4, w-P0.31-D5 … D7   |
// | button   | w-P1.11-BTN, w-P1.11-RPD (P1.11)                     |
// | shock    | w-P0.03-signal (P0.03)                               |

type Lcd = HTMLElement & { text: string };
type Button = HTMLElement & { pressed: boolean };

const LCD_BUS = ['w-P0.04-RS', 'w-P0.05-E', 'w-P0.02-D4', 'w-P0.31-D5', 'w-P0.29-D6', 'w-P0.30-D7'];
// Cell coordinates: the shock sensor spans x -110..-50, y 260..324 below the button's
// supply lead (y 250); its signal runs right at y 308. The stopwatch and LCD1's rows (LCD1 is
// turned 90°, so they are repeated upright) share the strip under the DK.
const PANEL = { x: 0, y: 316, w: 216, h: 106 };
// The finger hovers up to y -60 over the button.
const FINGER_TOP = -60;
const READ = { x: 230, y: 310, w: 320, h: 98 };

const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-rtn-panel {
          position: absolute; left: ${PANEL.x}px; top: ${PANEL.y}px; width: ${PANEL.w}px; height: ${PANEL.h}px;
          box-sizing: border-box; padding: 6px 14px; display: flex; flex-direction: column; justify-content: center;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
        }
        .c-rtn-title { font: 600 36px/44px var(--sans); color: var(--muted); }
        .c-rtn-ms { font: 600 36px/44px var(--mono); color: var(--ink); white-space: nowrap; }
        .c-rtn-ms.c-rtn-run { color: var(--accent); }
        .c-rtn-read { position: absolute; left: ${READ.x}px; top: ${READ.y}px; width: ${READ.w}px; height: ${READ.h}px; box-sizing: border-box;
          padding: 6px 9px; border-radius: 4px; background: #6cb201; border: 3px solid #1f2937;
          font: 600 36px/41px ui-monospace, Menlo, monospace; color: #000; white-space: pre; overflow: hidden; }
      </style>
      ${motion('knock')}
      <div class="c-rtn-panel"><div class="c-rtn-title">Stopwatch</div><div class="c-rtn-ms"></div></div>
      <div class="c-rtn-read"></div>
      ${finger('f', { length: 48 })}`,
    bounds: [Math.min(PANEL.x, READ.x), FINGER_TOP, Math.max(PANEL.x + PANEL.w, READ.x + READ.w), Math.max(PANEL.y + PANEL.h, READ.y + READ.h)],
  },
  run(t, view) {
    const watch = stopwatchAt(t);
    const ms = view.q<HTMLElement>('.c-rtn-ms');
    ms.textContent = `${Math.round(watch.ms)} ms`;
    ms.classList.toggle('c-rtn-run', watch.running);

    const btn = view.box('BTN');
    const pressing = pressFinger(view, 'f', t, { x: btn.x + btn.w / 2, y: btn.y + btn.h / 2 + 4 }, PRESSES);
    view.part<Button>('BTN').pressed = pressing;
    if (pressing) {
      view.glowWire('w-P1.11-BTN', 1);
      view.glowWire('w-P1.11-RPD', 1);
    }
    const knocking = ROUNDS.some((r) => t >= r.shock && t < r.shock + KNOCK_MS);
    setMotion(view, 'knock', view.box('SH1'), knocking ? 1 : 0, { sides: 'left' });
    if (knocking) view.glowWire('w-P0.03-signal', 1);

    const text = SCREENS.filter((s) => s.at <= t).pop()?.text ?? LAST;
    view.part<Lcd>('LCD1').text = text;
    view.q<HTMLElement>('.c-rtn-read').textContent = `${text.slice(0, 16).trimEnd()}\n${text.slice(16).trimEnd()}`;
  },
  activity: [{ wires: LCD_BUS, at: SCREENS.map((s) => s.at - 3) }],
};

export default cell;

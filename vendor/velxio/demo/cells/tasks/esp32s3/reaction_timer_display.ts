import type { Cell } from '../../cell';
import { finger, pressFinger } from '../../decor/finger';
import { motion, setMotion } from '../../decor/motion';
import { DURATION, KNOCK_MS, LAST, PRESSES, ROUNDS, SCREENS, stopwatchAt } from '../mega/reaction_timer_display';

// | board    | esp32-s3                                     |
// | LCD bus  | w-38-RS, w-39-E, w-40-D4 … w-42-D6, w-21-D7  |
// | button   | w-12-BTN, w-12-RPD (GPIO12)                  |
// | shock    | w-14-signal (GPIO14)                         |

type Lcd = HTMLElement & { text: string };
type Button = HTMLElement & { pressed: boolean };

const LCD_BUS = ['w-38-RS', 'w-39-E', 'w-40-D4', 'w-41-D5', 'w-42-D6', 'w-21-D7'];
// Cell coordinates: the shock sensor spans x -220..-156, y 58..118. Its signal lead drops
// 10 px right of it and its GND lead 32 px left, so the knock marks go on the left, scaled to clear it, and the
// stopwatch sits left of the GND lead.
const PANEL = { x: -500, y: 40, w: 216, h: 106 };

const cell: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-rte-panel {
          position: absolute; left: ${PANEL.x}px; top: ${PANEL.y}px; width: ${PANEL.w}px; height: ${PANEL.h}px;
          box-sizing: border-box; padding: 6px 14px; display: flex; flex-direction: column; justify-content: center;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
        }
        .c-rte-title { font: 600 36px/44px var(--sans); color: var(--muted); }
        .c-rte-ms { font: 600 36px/44px var(--mono); color: var(--ink); white-space: nowrap; }
        .c-rte-ms.c-rte-run { color: var(--accent); }
      </style>
      ${motion('knock')}
      <div class="c-rte-panel"><div class="c-rte-title">Stopwatch</div><div class="c-rte-ms"></div></div>
      ${finger('f', { length: 48 })}`,
    bounds: [PANEL.x, PANEL.y, PANEL.x + PANEL.w, PANEL.y + PANEL.h],
  },
  run(t, view) {
    const watch = stopwatchAt(t);
    const ms = view.q<HTMLElement>('.c-rte-ms');
    ms.textContent = `${Math.round(watch.ms)} ms`;
    ms.classList.toggle('c-rte-run', watch.running);

    const btn = view.box('BTN');
    const pressing = pressFinger(view, 'f', t, { x: btn.x + btn.w / 2, y: btn.y + btn.h / 2 + 4 }, PRESSES);
    view.part<Button>('BTN').pressed = pressing;
    if (pressing) {
      view.glowWire('w-12-BTN', 1);
      view.glowWire('w-12-RPD', 1);
    }
    const knocking = ROUNDS.some((r) => t >= r.shock && t < r.shock + KNOCK_MS);
    setMotion(view, 'knock', view.box('SH1'), knocking ? 1 : 0, { sides: 'left', scale: 0.8 });
    if (knocking) view.glowWire('w-14-signal', 1);

    const text = SCREENS.filter((s) => s.at <= t).pop()?.text ?? LAST;
    view.part<Lcd>('LCD1').text = text;
  },
  activity: [{ wires: LCD_BUS, at: SCREENS.map((s) => s.at - 3) }],
};

export default cell;

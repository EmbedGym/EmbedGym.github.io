import type { Cell } from '../../cell';
import { motion, setMotion } from '../../decor/motion';
import { finger, pressFinger } from '../../decor/finger';

type Lcd = HTMLElement & { text: string };
type Button = HTMLElement & { pressed: boolean };

// A press starts the timer and the LCD shows "Timing..."; a knock on the shock sensor
// stops it and the LCD shows the time. Two rounds; the loop starts on the second result.
export const DURATION = 5200;
export const ROUNDS = [
  { press: 800, shock: 1550 },
  { press: 2800, shock: 4000 },
];
export const PRESSES: [number, number][] = ROUNDS.map(({ press }) => [press, press + 200]);
export const KNOCK_MS = 160;
// loop() polls every 20 ms, so the LCD catches up within one pass.
const LCD_LAG = 15;

const row = (s: string) => s.padEnd(16, ' ');
const result = (r: (typeof ROUNDS)[number]) => r.shock - r.press;

export const LAST = row(`Time: ${result(ROUNDS[ROUNDS.length - 1])} ms`) + row('');
export const SCREENS = ROUNDS.flatMap((r) => [
  { at: r.press + LCD_LAG, text: row('Timing...') + row('') },
  { at: r.shock + LCD_LAG, text: row(`Time: ${result(r)} ms`) + row('') },
]);

export function stopwatchAt(t: number) {
  const r = ROUNDS.filter((r) => r.press <= t).pop();
  if (!r) return { running: false, ms: result(ROUNDS[ROUNDS.length - 1]) };
  return t < r.shock ? { running: true, ms: t - r.press } : { running: false, ms: result(r) };
}

// Cell coordinates: the shock sensor spans x 404..468, y -98..-38; its GND lane runs at x 510.
const PANEL = { x: 528, y: -112, w: 200, h: 98 };

const reactionTimer: Cell = {
  duration: DURATION,
  decor: {
    html: `
      <style>
        .c-rt-panel {
          position: absolute; left: ${PANEL.x}px; top: ${PANEL.y}px; width: ${PANEL.w}px;
          box-sizing: border-box; padding: 8px 14px;
          background: #f8fafc; border: 1.5px solid #cfd6df; border-radius: 12px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
        }
        .c-rt-title { font: 600 27px/34px var(--sans); color: var(--muted); }
        .c-rt-ms { font: 600 34px/44px var(--mono); color: var(--ink); white-space: nowrap; }
        .c-rt-ms.c-rt-run { color: var(--accent); }
      </style>
      ${motion('knock')}
      <div class="c-rt-panel"><div class="c-rt-title">Stopwatch</div><div class="c-rt-ms"></div></div>
      ${finger('b')}`,
    bounds: [404 - 36, PANEL.y, PANEL.x + PANEL.w, PANEL.y + PANEL.h],
  },
  run(t, view) {
    const watch = stopwatchAt(t);
    const ms = view.q<HTMLElement>('.c-rt-ms');
    ms.textContent = `${Math.round(watch.ms)} ms`;
    ms.classList.toggle('c-rt-run', watch.running);

    const btn = view.box('BTN');
    const pressing = pressFinger(view, 'b', t, { x: btn.x + btn.w / 2, y: btn.y + btn.h / 2 + 4 }, PRESSES);
    view.part<Button>('BTN').pressed = pressing;
    if (pressing) {
      view.glowWire('w-2-BTN', 1);
      view.glowWire('w-2-RPD', 1);
    }
    const knocking = ROUNDS.some((r) => t >= r.shock && t < r.shock + KNOCK_MS);
    setMotion(view, 'knock', view.box('SH1'), knocking ? 1 : 0);
    if (knocking) view.glowWire('w-3-signal', 1);

    view.part<Lcd>('LCD1').text = SCREENS.filter((s) => s.at <= t).pop()?.text ?? LAST;
  },
  activity: [
    { wires: ['w-12-RS', 'w-11-E', 'w-4-D4', 'w-5-D5', 'w-6-D6', 'w-7-D7'], at: SCREENS.map((s) => s.at - 3) },
  ],
};

export default reactionTimer;

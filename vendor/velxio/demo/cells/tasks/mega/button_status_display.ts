import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial, type Print } from '../../kit';
import { finger, pressFinger } from '../../decor/finger';

// The first press is held: the sketch prints once on the press edge, not while held.
export const PRESSES: [number, number][] = [
  [600, 1900],
  [2500, 2800],
];
export const DURATION = 3800;

/** One line per press edge, `printMs` after it; the previous loop's lines are already on screen at t=0, matching the end state. */
export function statusPrints(printMs: number): Print[] {
  const loop: Print[] = PRESSES.map(([down]) => ({ t: down + printMs, text: 'Button Pressed!' }));
  return [...loop.map((p) => ({ ...p, t: p.t - DURATION })), ...loop];
}

// "Button Pressed!\r\n" takes about 18 ms at 9600 baud.
const PRINTS = statusPrints(20);
const PANEL = { x: -286, y: USB.mega.y - 56, w: 256, h: 112 };

const buttonStatusDisplay: Cell = {
  duration: DURATION,
  decor: {
    html: `${serialPanel('out', PANEL, { note: '9600', cableTo: USB.mega })}${finger('f')}`,
    bounds: [PANEL.x, -200, PANEL.x + PANEL.w, PANEL.y + PANEL.h],
  },
  run(t, view) {
    const btn = view.box('BTN');
    const cap = { x: btn.x + btn.w / 2, y: btn.y + btn.h / 2 + 4 };
    const pressing = pressFinger(view, 'f', t, cap, PRESSES);
    view.part<HTMLElement & { pressed: boolean }>('BTN').pressed = pressing;
    if (pressing) {
      view.glowWire('w-2-BTN', 1);
      view.glowWire('w-2-RPD', 1);
    }
    showSerial(view, 'out', t, PRINTS, { board: 'arduino-mega' });
  },
};

export default buttonStatusDisplay;

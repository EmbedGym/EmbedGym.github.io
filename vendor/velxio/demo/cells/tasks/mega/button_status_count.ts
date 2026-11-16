import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial, type Print } from '../../kit';
import { finger, pressFinger } from '../../decor/finger';

export const PRESSES: [number, number][] = [
  [700, 950],
  [1500, 1750],
  [2300, 2550],
];
// The firmware prints "Count: n" on each press edge, `delay` ms after it (the line's transmit time).
export const countPrints = (delay: number): Print[] => PRESSES.map(([down], i) => ({ t: down + delay, text: `Count: ${i + 1}` }));
// "Count: n\r\n" takes about 10 ms at 9600 baud.
const PRINTS = countPrints(12);
const PANEL = { x: -270, y: USB.mega.y - 56, w: 220, h: 112 };

const buttonStatusCount: Cell = {
  duration: 3600,
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
    showSerial(view, 'out', t, PRINTS, { board: 'arduino-mega', fadeFrom: 3250 });
  },
};

export default buttonStatusCount;

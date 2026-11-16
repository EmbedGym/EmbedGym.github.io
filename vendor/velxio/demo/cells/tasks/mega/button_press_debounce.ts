import type { Cell, CellView } from '../../cell';
import { USB, serialPanel, showSerial, type Print } from '../../kit';
import { finger, pressFinger } from '../../decor/finger';
import { LAG, ZOOM as ZOOM_SIZE, runZoom, zoomHtml } from './buzzer_button';

export { ZOOM_SIZE };
export const PRESSES: [number, number][] = [
  [500, 800],
  [1300, 1600],
  [2100, 2400],
];
export const DURATION = 3600;
const ZOOM_PRESSES = PRESSES.map(([down, up]): [number, number] => [down, up - LAG]);

/** Each press's line, `printMs` after the pin has been steady 50 ms; the previous loop's lines are already on screen at t=0, matching the end state. */
export function debouncePrints(printMs: number): Print[] {
  const loop: Print[] = PRESSES.map(([down]) => ({ t: down + LAG + printMs, text: 'Button Pressed!' }));
  return [...loop.map((p) => ({ ...p, t: p.t - DURATION })), ...loop];
}

/** The zoom panel at (x, y), classes prefixed `p`, titled with the pin's name; a longer name needs a narrower `debFont`. */
export const debounceZoom = (p: string, x: number, y: number, pinName: string, font = 22, debFont = 'var(--mono)') =>
  zoomHtml(p, pinName, { x, y }, font, debFont, 'print');

/** Presses the button, sweeps the zoom and glows `signalWires` while the pin reads HIGH. */
export function runDebounce(view: CellView, p: string, t: number, signalWires: string[]) {
  const btn = view.box('BTN');
  const cap = { x: btn.x + btn.w / 2, y: btn.y + btn.h / 2 + 4 };
  const pressing = pressFinger(view, 'f', t, cap, PRESSES);
  view.part<HTMLElement & { pressed: boolean }>('BTN').pressed = pressing;
  // runZoom keeps a press up through the release's debounce (the buzzer's tone
  // runs until then); nothing here waits on the release, so the zoom ends with it.
  if (runZoom(view, p, t, pressing, true, ZOOM_PRESSES)) for (const id of signalWires) view.glowWire(id, 1);
}

// "Button Pressed!\r\n" takes about 18 ms at 9600 baud.
const PRINTS = debouncePrints(18);
const SERIAL = { x: -286, y: USB.mega.y - 56, w: 256, h: 112 };
const ZOOM = { x: -176, y: -146, w: ZOOM_SIZE.w, h: ZOOM_SIZE.h };

const buttonPressDebounce: Cell = {
  duration: DURATION,
  decor: {
    html: `${debounceZoom('c-db', ZOOM.x, ZOOM.y, 'pin 2')}
      ${serialPanel('out', SERIAL, { note: '9600', cableTo: USB.mega })}${finger('f')}`,
    bounds: [SERIAL.x, -160, ZOOM.x + ZOOM.w, SERIAL.y + SERIAL.h],
  },
  run(t, view) {
    runDebounce(view, 'c-db', t, ['w-2-BTN', 'w-2-RPD']);
    showSerial(view, 'out', t, PRINTS, { board: 'arduino-mega' });
  },
};

export default buttonPressDebounce;

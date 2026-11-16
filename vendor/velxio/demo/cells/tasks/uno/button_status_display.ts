import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial } from '../../kit';
import { finger, pressFinger } from '../../decor/finger';
import { DURATION, PRESSES, statusPrints } from '../mega/button_status_display';

const BOARD = 'arduino-uno';
const SIGNAL_WIRES = ['w-2-BTN', 'w-2-RPD'];

// The sketch prints on each press edge; "Button Pressed!\r\n" takes about 18 ms at 9600 baud.
const PRINTS = statusPrints(20);
const PANEL = { x: -286, y: USB.uno.y - 56, w: 256, h: 112 };

const buttonStatusDisplayUno: Cell = {
  duration: DURATION,
  decor: {
    html: `${serialPanel('out', PANEL, { note: '9600', cableTo: USB.uno })}${finger('f', { length: 60 })}`,
    bounds: [PANEL.x, -60, PANEL.x + PANEL.w, PANEL.y + PANEL.h],
  },
  run(t, view) {
    const btn = view.box('BTN');
    const cap = { x: btn.x + btn.w / 2, y: btn.y + btn.h / 2 + 4 };
    const pressing = pressFinger(view, 'f', t, cap, PRESSES);
    view.part<HTMLElement & { pressed: boolean }>('BTN').pressed = pressing;
    if (pressing) for (const id of SIGNAL_WIRES) view.glowWire(id, 1);
    showSerial(view, 'out', t, PRINTS, { board: BOARD });
  },
};

export default buttonStatusDisplayUno;

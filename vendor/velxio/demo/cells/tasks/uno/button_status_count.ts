import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial } from '../../kit';
import { finger, pressFinger } from '../../decor/finger';
import { PRESSES, countPrints } from '../mega/button_status_count';

const BOARD = 'arduino-uno';
const SIGNAL_WIRES = ['w-2-BTN', 'w-2-RPD'];

// "Count: n\r\n" takes about 10 ms at 9600 baud.
const PRINTS = countPrints(12);
const PANEL = { x: -270, y: USB.uno.y - 56, w: 220, h: 112 };

const buttonStatusCountUno: Cell = {
  duration: 3600,
  decor: {
    html: `${serialPanel('out', PANEL, { note: '9600', cableTo: USB.uno })}${finger('f', { length: 60, rotate: 90 })}`,
    // The finger presses from the right: the pin 2 wire comes in over the button's top.
    bounds: [PANEL.x, -30, 410, PANEL.y + PANEL.h],
  },
  run(t, view) {
    const btn = view.box('BTN');
    const cap = { x: btn.x + btn.w / 2, y: btn.y + btn.h / 2 };
    const pressing = pressFinger(view, 'f', t, cap, PRESSES);
    view.part<HTMLElement & { pressed: boolean }>('BTN').pressed = pressing;
    if (pressing) for (const id of SIGNAL_WIRES) view.glowWire(id, 1);
    showSerial(view, 'out', t, PRINTS, { board: BOARD, fadeFrom: 3250 });
  },
};

export default buttonStatusCountUno;

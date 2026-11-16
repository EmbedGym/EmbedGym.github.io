import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial } from '../../kit';
import { finger, pressFinger } from '../../decor/finger';
import { PRESSES, countPrints } from '../mega/button_status_count';

const SIGNAL_WIRES = ['w-P1.11-BTN', 'w-P1.11-RPD'];

// main.c polls every 1 ms (k_msleep(1)) and printk()s at 115200 baud: about 1 ms.
const PRINTS = countPrints(1);
// The card spans the whole board (VDD is on the bottom header), so it is drawn small and the text is enlarged.
const PANEL = { x: -330, y: USB.nrf52840.y - 80, w: 300, h: 150 };

const buttonStatusCountNrf52840: Cell = {
  duration: 3600,
  decor: {
    html: `${serialPanel('out', PANEL, { note: '115200', cableTo: USB.nrf52840, fontSize: 36 })}${finger('f', { length: 60, rotate: 90 })}`,
    // The finger presses from the right, beside the board.
    bounds: [PANEL.x, -80, 650, PANEL.y + PANEL.h],
  },
  run(t, view) {
    const btn = view.box('BTN');
    const cap = { x: btn.x + btn.w / 2, y: btn.y + btn.h / 2 };
    const pressing = pressFinger(view, 'f', t, cap, PRESSES);
    view.part<HTMLElement & { pressed: boolean }>('BTN').pressed = pressing;
    if (pressing) for (const id of SIGNAL_WIRES) view.glowWire(id, 1);
    showSerial(view, 'out', t, PRINTS, { fadeFrom: 3250 });
  },
};

export default buttonStatusCountNrf52840;

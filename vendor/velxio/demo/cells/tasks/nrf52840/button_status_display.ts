import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial } from '../../kit';
import { finger, pressFinger } from '../../decor/finger';
import { DURATION, PRESSES, statusPrints } from '../mega/button_status_display';

const SIGNAL_WIRES = ['w-P1.11-BTN', 'w-P1.11-RPD'];

// main.c polls every 1 ms (k_msleep(1)) and printk()s at 115200 baud: about 2 ms.
const PRINTS = statusPrints(2);
const PANEL = { x: -350, y: USB.nrf52840.y - 56, w: 270, h: 112 };

const buttonStatusDisplayNrf52840: Cell = {
  duration: DURATION,
  decor: {
    html: `${serialPanel('out', PANEL, { note: '115200', cableTo: USB.nrf52840 })}${finger('f', { length: 60, rotate: 180 })}`,
    // The finger presses from below the button, clear of its leads at the top.
    bounds: [PANEL.x, -60, -10, PANEL.y + PANEL.h],
  },
  run(t, view) {
    const btn = view.box('BTN');
    const cap = { x: btn.x + btn.w / 2, y: btn.y + btn.h / 2 + 4 };
    const pressing = pressFinger(view, 'f', t, cap, PRESSES);
    view.part<HTMLElement & { pressed: boolean }>('BTN').pressed = pressing;
    if (pressing) for (const id of SIGNAL_WIRES) view.glowWire(id, 1);
    showSerial(view, 'out', t, PRINTS);
  },
};

export default buttonStatusDisplayNrf52840;

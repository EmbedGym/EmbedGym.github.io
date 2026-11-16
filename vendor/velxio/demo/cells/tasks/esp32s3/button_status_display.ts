import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial } from '../../kit';
import { finger, pressFinger } from '../../decor/finger';
import { DURATION, PRESSES, statusPrints } from '../mega/button_status_display';

const SIGNAL_WIRES = ['w-12-BTN', 'w-12-RPD'];

// main.c polls every FreeRTOS tick (vTaskDelay(1), 10 ms) and printf()s at
// 115200 baud, so a line lands within ~10 ms of the press edge.
const PRINTS = statusPrints(6);
// The card spans 3V3 at the board's top to the console socket at its bottom, so
// it is drawn small and the monitor's text is enlarged.
const PANEL = { x: -300, y: USB.esp32s3.y + 26, w: 380, h: 150 };

const buttonStatusDisplayEsp32s3: Cell = {
  duration: DURATION,
  decor: {
    html: `${serialPanel('out', PANEL, { note: '115200', cableTo: USB.esp32s3, fontSize: 36 })}${finger('f')}`,
    bounds: [PANEL.x, 60, PANEL.x + PANEL.w, PANEL.y + PANEL.h],
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

export default buttonStatusDisplayEsp32s3;

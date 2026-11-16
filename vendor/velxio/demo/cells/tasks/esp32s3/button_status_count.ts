import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial } from '../../kit';
import { finger, pressFinger } from '../../decor/finger';
import { PRESSES, countPrints } from '../mega/button_status_count';

const SIGNAL_WIRES = ['w-12-BTN', 'w-12-RPD'];

// main.c polls every tick (vTaskDelay(1), 10 ms) and printf()s at 115200 baud: 5 ms on average.
const PRINTS = countPrints(5);
// Under the console socket, which opens down at the board's bottom end. The card
// spans 3V3 at the board's top to this panel, so it is drawn small and the text is enlarged.
const PANEL = { x: -230, y: USB.esp32s3.y + 26, w: 300, h: 150 };

const buttonStatusCountEsp32s3: Cell = {
  duration: 3600,
  decor: {
    html: `${serialPanel('out', PANEL, { note: '115200', cableTo: USB.esp32s3, fontSize: 36 })}${finger('f', { length: 60, rotate: 270 })}`,
    // The finger presses from the left, away from the board.
    bounds: [-260, 40, PANEL.x + PANEL.w, PANEL.y + PANEL.h],
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

export default buttonStatusCountEsp32s3;

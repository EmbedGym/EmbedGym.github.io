import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial } from '../../kit';
import { finger } from '../../decor/finger';
import { DURATION, ZOOM_SIZE, debouncePrints, debounceZoom, runDebounce } from '../mega/button_press_debounce';

const PIN_NAME = 'P1.11';
const SIGNAL_WIRES = ['w-P1.11-BTN', 'w-P1.11-RPD'];

// main.c polls every 1 ms (k_msleep(1)) and printk()s at 115200 baud: about 2 ms.
const PRINTS = debouncePrints(2);
const SERIAL = { x: -350, y: USB.nrf52840.y - 33, w: 270, h: 112 };
// Above the monitor, left of the button: the button sits left of the board, so the zoom stays beside it.
const ZOOM = { x: -380, y: SERIAL.y - 10 - ZOOM_SIZE.h, w: ZOOM_SIZE.w, h: ZOOM_SIZE.h };

const buttonPressDebounceNrf52840: Cell = {
  duration: DURATION,
  decor: {
    html: `${debounceZoom('c-dbn', ZOOM.x, ZOOM.y, PIN_NAME, 23, 'var(--sans)')}
      ${serialPanel('out', SERIAL, { note: '115200', cableTo: USB.nrf52840 })}${finger('f', { length: 60, rotate: 180 })}`,
    bounds: [ZOOM.x, ZOOM.y, -10, SERIAL.y + SERIAL.h],
  },
  run(t, view) {
    runDebounce(view, 'c-dbn', t, SIGNAL_WIRES);
    showSerial(view, 'out', t, PRINTS);
  },
};

export default buttonPressDebounceNrf52840;

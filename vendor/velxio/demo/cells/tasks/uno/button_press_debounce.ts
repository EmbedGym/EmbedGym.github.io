import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial } from '../../kit';
import { finger } from '../../decor/finger';
import { DURATION, ZOOM_SIZE, debouncePrints, debounceZoom, runDebounce } from '../mega/button_press_debounce';

const BOARD = 'arduino-uno';
const PIN_NAME = 'pin 2';
const SIGNAL_WIRES = ['w-2-BTN', 'w-2-RPD'];

// "Button Pressed!\r\n" takes about 18 ms at 9600 baud.
const PRINTS = debouncePrints(18);
const SERIAL = { x: -300, y: USB.uno.y - 98, w: 256, h: 112 };
// Below the monitor, left of the board: the button sits right of it, so the card stays short.
const ZOOM = { x: -300, y: SERIAL.y + SERIAL.h + 10, w: ZOOM_SIZE.w, h: ZOOM_SIZE.h };

const buttonPressDebounceUno: Cell = {
  duration: DURATION,
  decor: {
    html: `${debounceZoom('c-dbu', ZOOM.x, ZOOM.y, PIN_NAME)}
      ${serialPanel('out', SERIAL, { note: '9600', cableTo: USB.uno })}${finger('f', { length: 60 })}`,
    bounds: [SERIAL.x, -60, ZOOM.x + ZOOM.w, ZOOM.y + ZOOM.h],
  },
  run(t, view) {
    runDebounce(view, 'c-dbu', t, SIGNAL_WIRES);
    showSerial(view, 'out', t, PRINTS, { board: BOARD });
  },
};

export default buttonPressDebounceUno;

import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial } from '../../kit';
import { finger } from '../../decor/finger';
import { DURATION, ZOOM_SIZE, debouncePrints, debounceZoom, runDebounce } from '../mega/button_press_debounce';

const BOARD = 'esp32-s3';
const PIN_NAME = 'GPIO 12';
const SIGNAL_WIRES = ['w-12-BTN', 'w-12-RPD'];

// main.c polls every tick (vTaskDelay(1), 10 ms) and printf()s at 115200 baud,
// so a line lands within ~10 ms of the 50 ms mark; 5 ms is the mean.
const PRINTS = debouncePrints(5);
// The card spans 3V3 at the board's top to the console socket at its bottom, so
// it is drawn small; text and the zoom are enlarged to stay readable.
const BIG = 1.8;
const SERIAL = { x: -300, y: USB.esp32s3.y + 26, w: 380, h: 150 };
const ZOOM = { x: -170 - ZOOM_SIZE.w * BIG, y: 140, w: ZOOM_SIZE.w * BIG, h: ZOOM_SIZE.h * BIG };

const buttonPressDebounceEsp32s3: Cell = {
  duration: DURATION,
  decor: {
    html: `<div style="position:absolute;left:${ZOOM.x}px;top:${ZOOM.y}px;transform:scale(${BIG});transform-origin:0 0">
        ${debounceZoom('c-dbe', 0, 0, PIN_NAME, 20, 'var(--sans)')}
      </div>
      ${serialPanel('out', SERIAL, { note: '115200', cableTo: USB.esp32s3, fontSize: 36 })}${finger('f')}`,
    bounds: [ZOOM.x, 60, SERIAL.x + SERIAL.w, SERIAL.y + SERIAL.h],
  },
  run(t, view) {
    runDebounce(view, 'c-dbe', t, SIGNAL_WIRES);
    showSerial(view, 'out', t, PRINTS);
  },
};

export default buttonPressDebounceEsp32s3;

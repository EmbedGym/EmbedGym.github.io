import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial } from '../../kit';
import { DURATION, PRINTS, FRAMES, scene } from '../mega/amg8833_motion_detector';

// The ESP-IDF firmware reads GPIO38/39 and prints the Mega's line once a second at 115200. The sensor
// is turned 90°, so its columns run down the card and the hand sweeps down over it, clear of its pins.
// The card is tall (I2C at the board's top, the console socket at its bottom), so the text is larger.
const BUS = ['w-38-SDA', 'w-39-SCL'];
// Beside the board's bottom, its top below the console socket. Two rows, so MOTION DETECTED shows
// under its report: 34 + 2 x 50.3 + 10.
const PANEL = { x: -720, y: 358, w: 700, h: 145 };
const SCENE = scene('c-ampme', { view: { x: -173, y: 110 }, lens: { x: 228, y: 138.6 }, down: true });

const amg8833MotionDetectorEsp32s3: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('out', PANEL, { note: '115200', cableTo: USB.esp32s3, fontSize: 37 })}
      ${SCENE.html}`,
    bounds: [PANEL.x, -6, 267.4, PANEL.y + PANEL.h],
  },
  activity: [{ wires: BUS, at: [FRAMES[FRAMES.length - 1] - DURATION, ...FRAMES] }],
  run(t, view) {
    SCENE.run(view, t);
    showSerial(view, 'out', t, PRINTS);
  },
};

export default amg8833MotionDetectorEsp32s3;

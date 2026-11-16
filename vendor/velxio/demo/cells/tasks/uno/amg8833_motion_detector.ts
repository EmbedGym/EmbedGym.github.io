import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial } from '../../kit';
import { DURATION, PRINTS, FRAMES, scene } from '../mega/amg8833_motion_detector';

// The Uno runs the Mega's sketch on A4/A5 at 9600 baud. The sensor hangs below the board, so the hand
// crosses its body below its pins. The serial monitor sits over the heat map: a report wraps onto two
// rows and MOTION DETECTED takes a third, so both show together (34 + 3 x 34 + 10).
const BUS = ['w-SDA', 'w-SCL'];
const PANEL = { x: -380, y: 0, w: 360, h: 146 };
const SCENE = scene('c-ampmu', { view: { x: -380, y: 150 }, lens: { x: 272.4, y: 308 }, handScale: 0.8 });

const amg8833MotionDetectorUno: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('out', PANEL, { note: '9600', cableTo: USB.uno, wrap: true })}
      ${SCENE.html}`,
    bounds: [PANEL.x, 0, 361, 150 + SCENE.h],
  },
  activity: [{ wires: BUS, at: [FRAMES[FRAMES.length - 1] - DURATION, ...FRAMES] }],
  run(t, view) {
    SCENE.run(view, t);
    showSerial(view, 'out', t, PRINTS, { board: 'arduino-uno' });
  },
};

export default amg8833MotionDetectorUno;

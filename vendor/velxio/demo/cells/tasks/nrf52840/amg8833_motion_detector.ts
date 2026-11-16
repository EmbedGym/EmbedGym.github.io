import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial } from '../../kit';
import { DURATION, PRINTS, FRAMES, scene } from '../mega/amg8833_motion_detector';

// The Zephyr firmware reads P0.21/P0.27 and prints the Mega's line once a second at 115200. The hand
// crosses the sensor's body above its pins; the heat map sits left of it, above the serial monitor.
const BUS = ['w-P0.21-SDA', 'w-P0.27-SCL'];
// Four rows, two wrapped readings: 34 + 4 x 36.7 + 10; below the heat map.
const PANEL = { x: -462, y: 66, w: 442, h: 191 };
const SCENE = scene('c-ampmn', { view: { x: -230, y: -126 }, lens: { x: 24, y: -66 }, handScale: 0.8 });

const amg8833MotionDetectorNrf52840: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('out', PANEL, { note: '115200', cableTo: USB.nrf52840, fontSize: 27, wrap: true })}
      ${SCENE.html}`,
    bounds: [PANEL.x, -126.4, 113, PANEL.y + PANEL.h],
  },
  activity: [{ wires: BUS, at: [FRAMES[FRAMES.length - 1] - DURATION, ...FRAMES] }],
  run(t, view) {
    SCENE.run(view, t);
    showSerial(view, 'out', t, PRINTS);
  },
};

export default amg8833MotionDetectorNrf52840;

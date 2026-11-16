import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial } from '../../kit';
import { DURATION, PRINTS, READS, scene } from '../mega/amg8833_hotspot_zone';

// The Uno runs the Mega's sketch on A4/A5 at 9600 baud. The sensor hangs below the board, so the hand
// crosses its body below its pins; the heat map sits at the far left, beyond the serial monitor and its cable.
const BUS = ['w-SDA', 'w-SCL'];
const PANEL = { x: -210, y: 0, w: 200, h: 248 };
const SCENE = scene('c-ampzu', { view: { x: -378, y: 0 }, lens: { x: 272.4, y: 308 }, handScale: 0.8, font: 25 });

const amg8833HotspotZoneUno: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('out', PANEL, { note: '9600', cableTo: USB.uno, wrap: true })}
      ${SCENE.html}`,
    bounds: [PANEL.x - 168, 0, 361, 336.4],
  },
  activity: [{ wires: BUS, at: READS }],
  run(t, view) {
    SCENE.run(view, t);
    showSerial(view, 'out', t, PRINTS, { board: 'arduino-uno' });
  },
};

export default amg8833HotspotZoneUno;

import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial } from '../../kit';
import { DURATION, PRINTS, READS, ledOn, scene } from '../mega/amg8833_hotspot_presence_alarm';

// The Uno runs the Mega's sketch (LED on pin 4, A4/A5) at 9600 baud. The sensor hangs below the board and
// the LED stands right of it. The serial monitor sits over the heat map: a detection wraps onto three rows
// (34 + 3 x 34 + 10).
const BUS = ['w-SDA', 'w-SCL'];
const PANEL = { x: -392, y: 0, w: 372, h: 146 };
const SCENE = scene('c-ampu', { view: { x: -392, y: 150 }, lens: { x: 272.4, y: 308 } });

const amg8833HotspotPresenceAlarmUno: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('out', PANEL, { note: '9600', cableTo: USB.uno, wrap: true })}
      ${SCENE.html}`,
    bounds: [PANEL.x, 0, 346, 336.4],
  },
  activity: [{ wires: BUS, at: READS }],
  run(t, view) {
    SCENE.run(view, t);
    view.part<HTMLElement & { value: boolean }>('L1').value = ledOn(t);
    if (ledOn(t)) {
      view.glowWire('w-D4-resistor', 1);
      view.glowWire('w-resistor-LED', 1);
    }
    showSerial(view, 'out', t, PRINTS, { board: 'arduino-uno' });
  },
};

export default amg8833HotspotPresenceAlarmUno;

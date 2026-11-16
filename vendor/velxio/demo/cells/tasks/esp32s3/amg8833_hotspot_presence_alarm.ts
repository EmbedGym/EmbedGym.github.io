import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial } from '../../kit';
import { DURATION, PRINTS, READS, ledOn, scene } from '../mega/amg8833_hotspot_presence_alarm';

// The ESP-IDF firmware reads GPIO38/39 once a second, drives the LED on GPIO10 and prints the Mega's lines
// at 115200. The sensor is turned 90°, so the hand sweeps down over it; the LED stands left of the board.
const BUS = ['w-38-SDA', 'w-39-SCL'];
// Beside the board's bottom, its top below the console socket; a detection wraps onto two rows at 37 px
// (the card is tall, so the text is larger): 34 + 2 x 50.3 + 10.
const FONT = 37;
const PANEL = { x: -720, y: 358, w: 700, h: 145 };
const SCENE = scene('c-ampae', { view: { x: -300, y: 150 }, lens: { x: 228, y: 138.6 }, down: true });

const amg8833HotspotPresenceAlarmEsp32s3: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('out', PANEL, { note: '115200', cableTo: USB.esp32s3, wrap: true, fontSize: FONT })}
      ${SCENE.html}`,
    bounds: [PANEL.x, -6, 267.4, PANEL.y + PANEL.h],
  },
  activity: [{ wires: BUS, at: READS }],
  run(t, view) {
    SCENE.run(view, t);
    view.part<HTMLElement & { value: boolean }>('L1').value = ledOn(t);
    if (ledOn(t)) {
      view.glowWire('w-10-R_LED', 1);
      view.glowWire('w-R_LED-L1', 1);
    }
    showSerial(view, 'out', t, PRINTS);
  },
};

export default amg8833HotspotPresenceAlarmEsp32s3;

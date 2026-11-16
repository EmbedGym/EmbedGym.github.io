import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial } from '../../kit';
import { DURATION, PRINTS, READS, ledOn, scene } from '../mega/amg8833_hotspot_presence_alarm';

// The Zephyr firmware reads P0.21/P0.27 once a second, drives the LED on P1.15 and prints the Mega's lines
// at 115200. The sensor and the LED stand above the top header.
const BUS = ['w-P0.21-SDA', 'w-P0.27-SCL'];
// Four rows below the heat map, a detection wrapping onto three: 34 + 4 x 36.7 + 10.
const PANEL = { x: -462, y: 66, w: 442, h: 191 };
const SCENE = scene('c-ampan', { view: { x: -200, y: -126 }, lens: { x: 24, y: -66 } });

const amg8833HotspotPresenceAlarmNrf52840: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('out', PANEL, { note: '115200', cableTo: USB.nrf52840, fontSize: 27, wrap: true })}
      ${SCENE.html}`,
    bounds: [PANEL.x, -126.4, 214, PANEL.y + PANEL.h],
  },
  activity: [{ wires: BUS, at: READS }],
  run(t, view) {
    SCENE.run(view, t);
    view.part<HTMLElement & { value: boolean }>('L1').value = ledOn(t);
    if (ledOn(t)) {
      view.glowWire('w-P1.15-R_LED', 1);
      view.glowWire('w-R_LED-L1', 1);
    }
    showSerial(view, 'out', t, PRINTS);
  },
};

export default amg8833HotspotPresenceAlarmNrf52840;

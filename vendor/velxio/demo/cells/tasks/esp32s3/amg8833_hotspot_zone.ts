import type { Cell } from '../../cell';
import { USB, serialPanel, showSerial } from '../../kit';
import { DURATION, PRINTS, READS, scene } from '../mega/amg8833_hotspot_zone';

// The ESP-IDF firmware reads GPIO38/39 and prints the Mega's line once a second at 115200. The sensor
// is turned 90°, so its columns run down the card and the hand sweeps down over it, clear of its pins.
// The card is tall (I2C at the board's top, the console socket at its bottom), so the text is larger.
const BUS = ['w-38-SDA', 'w-39-SCL'];
const PANEL = { x: -330, y: 372, w: 700, h: 90 };
const SCENE = scene('c-ampze', { view: { x: -173, y: 110 }, lens: { x: 228, y: 138.6 }, down: true, font: 34 });

const amg8833HotspotZoneEsp32s3: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('out', PANEL, { note: '115200', cableTo: USB.esp32s3, fontSize: 34 })}
      ${SCENE.html}`,
    bounds: [PANEL.x, -6, PANEL.x + PANEL.w, PANEL.y + PANEL.h],
  },
  activity: [{ wires: BUS, at: READS }],
  run(t, view) {
    SCENE.run(view, t);
    showSerial(view, 'out', t, PRINTS);
  },
};

export default amg8833HotspotZoneEsp32s3;

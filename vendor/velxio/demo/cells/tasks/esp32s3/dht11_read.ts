import { clamp, lerp } from '../../anim';
import type { Cell } from '../../cell';
import { cloud, setCloud } from '../../decor/sky';
import { USB, serialPanel, showSerial } from '../../kit';
import { BREATH_IN, BREATH_OUT, DURATION, PRINTS, READS, breath } from '../mega/dht11_read';

const DATA_WIRE = 'w-14-DATA';

// The board is tall, so the card's scale is low: the panel is wide and its text large.
const PANEL = { x: -300, y: 372, w: 700, h: 92 };

const dht11ReadEsp32s3: Cell = {
  duration: DURATION,
  decor: {
    html: `
      ${serialPanel('dhte', PANEL, { note: '115200', cableTo: USB.esp32s3, fontSize: 34 })}
      ${cloud('dhte', { kind: 'breath', scale: 0.8 })}`,
    bounds: [PANEL.x, 0, PANEL.x + PANEL.w, PANEL.y + PANEL.h],
  },
  activity: [{ wires: [DATA_WIRE], at: READS }],
  run(t, view) {
    // The breath drifts in from the left onto the sensor's grille, then thins away.
    const box = view.box('D1');
    const x = lerp(box.x - 40, box.x - 12, clamp((t - BREATH_IN) / (BREATH_OUT - BREATH_IN)));
    setCloud(view, 'dhte', { x, y: box.y + box.h / 2 - 8 }, breath(t));
    view.glowWire(DATA_WIRE, READS.some((r) => t >= r && t < r + 250) ? 1 : 0);
    showSerial(view, 'dhte', t, PRINTS);
  },
};

export default dht11ReadEsp32s3;
